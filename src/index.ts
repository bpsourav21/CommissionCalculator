import moment from 'moment';
import { InputDataDto } from './model/InputData';
import * as _ from 'underscore'
import fs from 'fs/promises'
import path from 'path'
import axios from 'axios';

const calculateCommissionFeeForInputData = (inputData: InputDataDto[], commissionConfig: any[]) => {
    const [cashInConfig, naturalPersonCashOutConfig, legalPersonCashOutConfig] = commissionConfig;

    const calculatePercents = (percents: number): number => percents / 100;

    const commissionFeeForCashIn = (item: InputDataDto): number => {
        const commissionFee =
            item.operation.amount * calculatePercents(cashInConfig.percents);

        return commissionFee > cashInConfig.max.amount
            ? cashInConfig.max.amount
            : commissionFee;
    }

    const commissionFeeForNaturalPersonCashOut = (item: InputDataDto): number => {
        const groupedDataByWeek =
            _.groupBy(
                inputData,
                item => moment(item.date).isoWeek()
            )
        // iso week start day from Monday
        const week = moment(item.date).isoWeek();
        const weeklyData =
            _.filter(
                groupedDataByWeek[week],
                d =>
                    d.user_id == item.user_id &&
                    d.type == 'cash_out' &&
                    d.user_type == 'natural' &&
                    moment(d.date).unix() <= moment(item.date).unix()
            )

        return _.reduce(
            weeklyData,
            (prev, curr) => {
                let total: number = prev.total + curr.operation.amount;
                let fee: number = 0;
                let isLimitExceeded: boolean = false

                if (total > naturalPersonCashOutConfig.week_limit.amount) {
                    // Below limit cash out is free
                    let weeklyLimit = prev.isLimitExceeded
                        ? 0
                        : naturalPersonCashOutConfig.week_limit.amount
                    // commission calculated after exceeding limit amount
                    let amount = item.operation.amount >= weeklyLimit
                        ? item.operation.amount - weeklyLimit
                        : item.operation.amount - (total - weeklyLimit)
                    fee =
                        amount *
                        calculatePercents(naturalPersonCashOutConfig.percents);
                    isLimitExceeded = true
                }
                else {
                    fee = 0;
                    isLimitExceeded = false
                }

                return {
                    total: total,
                    isLimitExceeded: isLimitExceeded,
                    fee: fee
                }
            },
            { total: 0, isLimitExceeded: false, fee: 0 }
        ).fee;
    }

    const commissionFeeForJuridicalPersonCashOut = (item: InputDataDto): number => {
        if (item.operation.amount >= legalPersonCashOutConfig.min.amount) {
            return item.operation.amount * calculatePercents(legalPersonCashOutConfig.percents)
        }
        else {
            return 0;
        }
    }

    const commissionFeeForCashOut = (item: InputDataDto): number => {
        let commissionFee = 0;
        if (item.user_type == 'natural') {
            commissionFee = commissionFeeForNaturalPersonCashOut(item)
        }
        else if (item.user_type == 'juridical') {
            commissionFee = commissionFeeForJuridicalPersonCashOut(item)
        }
        else {
            // this block will do nothing...
        }
        return commissionFee;
    }

    const calculateCommissionFee = (item: InputDataDto): number => {
        if (item.type == 'cash_in') {
            return commissionFeeForCashIn(item);
        }
        else if (item.type == 'cash_out') {
            return commissionFeeForCashOut(item);
        }
        else {
            // ideally this block will not work unless 
            // some corrupted data entered
            return 0;
        }
    }

    _.forEach(inputData, item => {
        const commissionFee = calculateCommissionFee(item);
        console.log(commissionFee.toFixed(2));
    })
}

const commissionConfigPromises = () => {
    const endpoint = "http://private-38e18c-uzduotis.apiary-mock.com/config/"
    const cash_in = axios.get(endpoint + "cash-in")
    const cash_out_natural = axios.get(endpoint + "cash-out/natural")
    const cash_out_jurdicial = axios.get(endpoint + "cash-out/juridical")

    return Promise.all([cash_in, cash_out_natural, cash_out_jurdicial]);
}

const [args] = process.argv.slice(2);
const fileLocation = path.join(__dirname, args);
fs.readFile(fileLocation, 'utf8')
    .then((data) => {
        let parsedData: InputDataDto[] = JSON.parse(data.toString());
        commissionConfigPromises()
            .then(res => {
                const commissionConfig = _.map(res, r => r.data);
                calculateCommissionFeeForInputData(parsedData, commissionConfig);
            })
            .catch(err => {
                throw err;
            });

    })
    .catch((error) => {
        throw error
    });



