export interface Cache {
  get<T = any>(key: string, resolve: () => Promise<T>): Promise<T>;
}
