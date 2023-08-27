import { Logger } from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { FindOptionField } from './models/model';

export class Paginate<T> {
  repository: SelectQueryBuilder<T>;
  globalSort: {
    [key: string]: DirectionType;
  };

  public constructor(
    repo: Repository<T>,
    public alias: string,
  ) {
    this.repository = repo.createQueryBuilder(alias);
    this.globalSort = {
      createdAt: 'DESC',
    };
  }

  add(
    colum: FindOptionField<T>,
    value,
    condition: boolean,
    operator: Operator,
  ) {
    if (condition) {
      const { query, queryStr } = buildQueryStr(
        this.alias,
        colum,
        value,
        operator,
      );
      this.repository.andWhere(queryStr, query);
    }
    return this;
  }
  sortBy(goal: string, order: DirectionType) {
    this.globalSort[goal] = order;
    return this;
  }
  leftJoinAndSelect(property: string, alias: string) {
    this.repository.leftJoinAndSelect(property, alias);
    return this;
  }
  async execute(limit: number, page: number) {
    try {
      if (limit && page) {
        this.repository.take(limit);
        this.repository.skip((page - 1) * limit);
        // this.repository.orderBy('createdAt', 'DESC');

        const [data, totalItems] = await Promise.all([
          this.repository.getMany(),
          this.repository.getCount(),
        ]);
        return {
          data,
          metaData: {
            totalItems,
            totalCurrentItems: data.length,
            totalPage: Math.ceil(totalItems / limit),
          },
        };
      }
      return await this.repository.getMany();
    } catch (error) {
      Logger.error(error);
      throw error;
    }
  }
}

export function buildQueryStr<T>(
  alias: string,
  colum: FindOptionField<T>,
  value,
  operator: Operator,
): { query: any; queryStr: string } {
  let queryStr = '';
  let query = null;
  switch (operator) {
    case 'LIKE_RIGHT':
      queryStr = `${alias}.${String(colum)} ilike :${String(colum)}`;
      query = { [colum]: `${value}%` };
      break;
    case 'MT':
      queryStr = `${alias}.${String(colum)} > :${String(colum)}`;
      query = { [colum]: value };
      break;
    case 'LTE':
      queryStr = `${alias}.${String(colum)} <= :${String(colum)}`;
      query = { [colum]: value };
      break;
    case 'LT':
      queryStr = `${alias}.${String(colum)} < :${String(colum)}`;
      query = { [colum]: value };
      break;
    default:
      break;
  }

  return { query, queryStr };
}

type Operator =
  | 'EQ'
  | 'GT'
  | 'GTE'
  | 'IN'
  | 'NULL'
  | 'LT'
  | 'LTE'
  | 'BTW'
  | 'LIKE'
  | 'LIKE_RIGHT'
  | 'LIKE_LEFT'
  | 'SW'
  | 'MT';

export type DirectionType = 'ASC' | 'DESC';
