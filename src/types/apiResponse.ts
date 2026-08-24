import { ObjectUtils } from '../utils/ObjectUtils';
import { AppError } from '../middleware/errorHandler';

export class ApiResponse<T, E = AppError> {
  // Readonly properties ensure the response cannot be mutated post-creation
  //public readonly success: boolean;
  public readonly data: T | undefined;
  public readonly error: E | undefined;

  private constructor(data: T | undefined, error: E | undefined) {
    this.data = data;
    this.error = error;
  }

  // Static Factory for creating a verified Success instance
  static Success<T, E = AppError>(data: T): ApiResponse<T, E> {
    const cleanedData = ObjectUtils.deepClean(data);
    return new ApiResponse<T, E>(cleanedData, undefined);
  }

  // Static Factory for creating a verified Failure instance
  static Failure<T, E = AppError>(error: E): ApiResponse<T, E> {
    // const cleanedError = ObjectUtils.deepClean(error);
    return new ApiResponse<T, E>(undefined, error);
  }

  // --- Type Guard Methods ---
  // These help TypeScript narrow the type down explicitly during use cases
  isSuccess(): this is ApiResponse<T, E> & { success: true; data: T; error: undefined } {
    return this.data !== undefined && this.error === undefined;
  }

  isFailure(): this is ApiResponse<T, E> & { success: false; data: undefined; error: E } {
    return this.data === undefined && this.error !== undefined;
  }

  unwrap(): T | E {
    if (this.data !== undefined && this.error === undefined) {
      return this.data;
    }
    if (this.data === undefined && this.error !== undefined) {
      return this.error;
    }
    throw new Error('Response is in an invalid state: both data and error are missing.');
  }
}
