import { AmountDto } from "./InputData";

export interface CashInConfigDto {
    percents: number,
    max: AmountDto,
}

export interface CashOutNaturalConfigDto {
    percents: number,
    week_limit: AmountDto,
}

export interface CashOutLegalConfigDto {
    percents: number,
    min: AmountDto
}

export interface CommissionConfigDto {
    cashIn: CashInConfigDto,
    cashout_natural: CashOutNaturalConfigDto,
    cashout_legal: CashOutLegalConfigDto
}