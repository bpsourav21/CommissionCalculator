export type UserType = "natural" | "juridical";
export type OperationType = "cash_in" | "cash_out";
export type CurrencyType = 'EUR';

export interface AmountDto {
    amount: number;
    currency: CurrencyType
}

export interface InputDataDto {
    date: string;
    user_id: number;
    user_type: UserType;
    type: OperationType,
    operation: AmountDto
}