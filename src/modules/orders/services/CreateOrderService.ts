import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer not found');
    }

    const productsById = products.reduce((prev, curr) => {
      Object.assign(prev, { [curr.id]: curr.quantity });
      return prev;
    }, {} as any);

    const productList = await this.productsRepository.findAllById(products);

    if (products.length !== productList.length) {
      throw new AppError('Product not found');
    }

    const productsWithNewQuantity = productList.map(product => {
      if (product.quantity < productsById[product.id]) {
        throw new AppError('Producs with insufficient quantity');
      }

      const quantity = product.quantity - productsById[product.id];

      return Object.assign(product, { quantity });
    });

    await this.productsRepository.updateQuantity(productsWithNewQuantity);

    const productsOrder = productList.map(p =>
      Object.assign(p, { quantity: productsById[p.id], product_id: p.id }),
    );

    const order = await this.ordersRepository.create({
      customer,
      products: productsOrder,
    });

    return order;
  }
}

export default CreateOrderService;
