export const minutes = (howMany: number) => 60 * howMany;
export const hours = (howMany: number) => 60 * howMany * minutes(1);
export const days = (howMany: number) => 24 * howMany * hours(1);
export const weeks = (howMany: number) => 7 * howMany * days(1);
