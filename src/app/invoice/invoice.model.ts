
export class SubItem {

    Type:string='';

    invoiceSubItemCode?: number=0;
   // invoiceMainItemCode?: number;
    serviceNumberCode?: number;
    description?: string;
    quantity?: number;
    unitOfMeasurementCode?:string;
    formulaCode?:string;
    amountPerUnit?: number;
    currencyCode?: string;
    total?: number;
    selected?: boolean;

   
}

export class MainItem {
    Type:string='';

    invoiceMainItemCode: number=0;
    serviceNumberCode?: number;
    description?: string;
    quantity?: number;
    unitOfMeasurementCode?:string;
    formulaCode?:string;
    amountPerUnit?: number;
    currencyCode?: string;
    total?: number;
    profitMargin?: number;
    totalWithProfit: number=0;
    selected?: boolean;
    subItems?:SubItem[];
    
    doNotPrint?:boolean;
    amountPerUnitWithProfit?: number;
    
}