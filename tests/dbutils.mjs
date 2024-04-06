import {transactionType, formatQuery} from '../utils/dbutils.js'
import { expect } from "chai";

describe('dbutils test', () => {
    it('should return unmodified query', () => {
        const result = formatQuery("SELECT * FROM table", transactionType.NO_TRANSACTION);
        expect(result).to.equal("SELECT * FROM table");
    });

    it('should return query with LOCK IN SHARE MODE', () => {
        const result = formatQuery("SELECT * FROM table", transactionType.READ_TRANSACTION);
        expect(result).to.equal("SELECT * FROM table LOCK IN SHARE MODE");
    });

    it('should return query with FOR UPDATE', () => {
        const result = formatQuery("SELECT * FROM table", transactionType.WRITE_TRANSACTION);
        expect(result).to.equal("SELECT * FROM table FOR UPDATE");
    });
});
