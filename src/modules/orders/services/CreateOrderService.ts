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
      Object.assign(prev, {
        [curr.id]: curr.quantity,
      });
      return prev;
    }, {} as any);

    const productList = await this.productsRepository.findAllById(products);

    const productListWithQuantity = productList.map(product => {
      return Object.assign(product, {
        quantity: productsById[product.id],
        product_id: product.id,
      });
    });

    const order = await this.ordersRepository.create({
      customer,
      products: productListWithQuantity,
    });

    return order;
  }
}

export default CreateOrderService;
