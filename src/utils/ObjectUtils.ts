export class ObjectUtils {
  /**
   * Recursively removes all undefined, null, and empty string properties from an object or array.
   */
  static deepClean<T>(obj: T): T {
    return this.cleanValue(obj) as T;
  }

  private static cleanValue(value: unknown): unknown {
    // Handle primitives, null, and undefined
    if (value === null || typeof value !== 'object') {
      return value;
    }

    // Handle Arrays
    if (Array.isArray(value)) {
      const items: unknown[] = value;
      return items
        .map((item) => this.cleanValue(item))
        .filter((item) => item !== undefined && item !== null && item !== '');
    }

    // Handle Plain Objects
    const cleanedObj: Record<string, unknown> = {};

    for (const [key, childValue] of Object.entries(value as Record<string, unknown>)) {
      // Skip if explicitly undefined, null, or an empty string
      if (
        childValue === undefined ||
        childValue === null ||
        childValue === '' ||
        (typeof childValue === 'number' && Number.isNaN(childValue))
      ) {
        continue;
      }

      // Recursively clean child objects or arrays
      const cleanedValue = this.cleanValue(childValue);

      // Double-check the cleaned value isn't an empty object resulting from a wipe
      if (
        typeof cleanedValue === 'object' &&
        cleanedValue !== null &&
        Object.keys(cleanedValue).length === 0 &&
        !(cleanedValue instanceof Date) // Don't wipe valid Date instances
      ) {
        continue;
      }

      cleanedObj[key] = cleanedValue;
    }

    return cleanedObj;
  }
}
