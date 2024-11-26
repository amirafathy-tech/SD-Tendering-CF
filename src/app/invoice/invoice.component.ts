import { ChangeDetectorRef, Component } from '@angular/core';
import * as FileSaver from 'file-saver';
import { ConfirmationService, MessageService } from 'primeng/api';
import { InvoiceService } from './invoice.service';
import { MainItem, SubItem } from './invoice.model';
import { ApiService } from '../shared/ApiService.service';
import { ServiceMaster } from '../models/service-master.model';
import { UnitOfMeasure } from '../models/unitOfMeasure.model';
import { Formula } from '../models/formulas.model';
import { Router } from '@angular/router';
import { catchError, of, switchMap, tap } from 'rxjs';

@Component({
  selector: 'app-invoice-test',
  templateUrl: './invoice.component.html',
  styleUrls: ['./invoice.component.css'],
  providers: [MessageService, InvoiceService, ConfirmationService],
  // changeDetection: ChangeDetectionStrategy.Default
})
export class InvoiceComponent {

  //cloud data:
  documentNumber!: number;
  itemNumber!: number;
  customerId!: number;
  savedDBApp: boolean = false;

  savedInMemory: boolean = false;

  // Pagination:
  loading: boolean = true;
  loadingSubItems: boolean = true;

  searchKey: string = ""
  currency: any
  totalValue: number = 0.0
  //fields for dropdown lists
  recordsServiceNumber!: ServiceMaster[];
  selectedServiceNumberRecord?: ServiceMaster
  selectedServiceNumber!: number;
  updateSelectedServiceNumber!: number
  updateSelectedServiceNumberRecord?: ServiceMaster
  shortText: string = '';
  updateShortText: string = '';
  shortTextChangeAllowed: boolean = false;
  updateShortTextChangeAllowed: boolean = false;

  // service number for subitem :
  selectedServiceNumberRecordSubItem?: ServiceMaster
  selectedServiceNumberSubItem!: number;
  updateSelectedServiceNumberSubItem!: number;
  updateSelectedServiceNumberRecordSubItem?: ServiceMaster
  shortTextSubItem: string = '';
  updateShortTextSubItem: string = '';
  shortTextChangeAllowedSubItem: boolean = false;
  updateShortTextChangeAllowedSubItem: boolean = false;

  recordsFormula!: any[];
  selectedFormula!: string;
  selectedFormulaRecord: any
  updatedFormula!: number;
  updatedFormulaRecord: any

  // formula for subitem :
  selectedFormulaSubItem!: string;
  selectedFormulaRecordSubItem: any
  updatedFormulaSubItem!: number;
  updatedFormulaRecordSubItem: any

  recordsUnitOfMeasure: UnitOfMeasure[] = [];
  selectedUnitOfMeasure!: string;

  // uom for subitem:
  selectedUnitOfMeasureSubItem!: string;

  recordsCurrency!: any[];
  selectedCurrency: string = "";
  // currency for subitem:
  selectedCurrencySubItem!: string;
  //
  selectedRowsForProfit: MainItem[] = [];
  profitMarginValue: number = 0;

  public rowIndex = 0;
  expandedRows: { [key: number]: boolean } = {};
  mainItemsRecords: MainItem[] = [];
  subItemsRecords: SubItem[] = [];

  updateProfitMargin(value: number) {
    console.log(value);
    if (value !== null && value < 0) {
      this.profitMarginValue = 0;
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Negative values are not allowed', life: 4000 });
    } else {
      for (const row of this.selectedRowsForProfit) {
        row.profitMargin = value;
        const { invoiceMainItemCode, totalWithProfit, ...mainItemWithoutMainItemCode } = row;
        const updatedMainItem = this.removePropertiesFrom(mainItemWithoutMainItemCode, ['invoiceMainItemCode', 'invoiceSubItemCode']);
        console.log(updatedMainItem);
        const newRecord: MainItem = {
          ...updatedMainItem,
          // Modify specific attributes
          subItems: (row?.subItems ?? []).map(subItem =>
            this.removeProperties(subItem, ['invoiceMainItemCode', 'invoiceSubItemCode'])
          ),
          profitMargin: value

        };
        console.log(newRecord);
        const updatedRecord = this.removeProperties(newRecord, ['selected']);
        console.log(updatedRecord);

        const bodyRequest: any = {
          quantity: updatedRecord.quantity,
          amountPerUnit: updatedRecord.amountPerUnit,
          profitMargin: updatedRecord.profitMargin,
          total: updatedRecord.total
        };

        this._ApiService.post<any>(`/total`, bodyRequest).subscribe({
          next: (res) => {
            console.log('mainitem with total:', res);
            // this.totalValue = 0;
            // updatedRecord.total = res.totalWithProfit;
            updatedRecord.amountPerUnitWithProfit = res.amountPerUnitWithProfit;
            updatedRecord.totalWithProfit = res.totalWithProfit;

            const mainItemIndex = this.mainItemsRecords.findIndex(item => item.invoiceMainItemCode === invoiceMainItemCode);
            if (mainItemIndex > -1) {
              this.mainItemsRecords[mainItemIndex] = { ...this.mainItemsRecords[mainItemIndex], ...updatedRecord };

              this.updateTotalValueAfterAction();
            }
            //  this.cdr.detectChanges();
            console.log(this.mainItemsRecords);

          }, error: (err) => {
            console.log(err);
          },
          complete: () => {
            this.selectedRowsForProfit = [];
          }
        });


        // this._ApiService.patch<MainItem>(`mainitems`, row.invoiceMainItemCode, updatedRecord).subscribe({
        // update<MainItem>(`mainitems/${this.documentNumber}/${this.itemNumber}/20/1/${this.customerId}`
        // this._ApiService.patch<MainItem>(`mainitems`, row.invoiceMainItemCode, updatedRecord).subscribe({
        //   next: (res) => {
        //     console.log('mainitem  updated:', res);
        //     this.totalValue = 0;
        //     this.ngOnInit()
        //   }, error: (err) => {
        //     console.log(err);
        //     this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Invalid Data' });
        //   },
        //   complete: () => {
        //     this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Profit Margin applied successfully ' });
        //     this.selectedRowsForProfit = [];
        //   }
        // });
      }
    }
  }

  constructor(private cdr: ChangeDetectorRef, private router: Router, private _ApiService: ApiService, private _InvoiceService: InvoiceService, private messageService: MessageService, private confirmationService: ConfirmationService) {
    this.documentNumber = this.router.getCurrentNavigation()?.extras.state?.['documentNumber'];
    this.itemNumber = this.router.getCurrentNavigation()?.extras.state?.['itemNumber'];
    this.customerId = this.router.getCurrentNavigation()?.extras.state?.['customerId'];
    console.log(this.documentNumber, this.itemNumber, this.customerId);
  }

  // Initial calculation of totalValue (call this when initializing the component)
  calculateTotalValue(): void {
    console.log(this.mainItemsRecords);
    
    this.totalValue = this.mainItemsRecords.reduce((sum, item) => sum + (item.totalWithProfit || 0), 0);
  }

  // Call this method when the mainItemsRecords array is updated
  updateTotalValueAfterAction(): void {
    this.calculateTotalValue();
    console.log('Updated Total Value:', this.totalValue);
  }

  ngOnInit() {
    this._ApiService.get<ServiceMaster[]>('servicenumbers').subscribe(response => {
      this.recordsServiceNumber = response;
      //.filter(record => record.deletionIndicator === false);
    });
    this._ApiService.get<any[]>('formulas').subscribe(response => {
      this.recordsFormula = response;
    });
    this._ApiService.get<any[]>('currencies').subscribe(response => {
      this.recordsCurrency = response;
    });
    this._ApiService.get<any[]>('measurements').subscribe(response => {
      this.recordsUnitOfMeasure = response;
    });
    if (this.savedInMemory) {
      this.mainItemsRecords = [...this._InvoiceService.getMainItems(this.documentNumber)];
      console.log(this.mainItemsRecords);
    }
    if (this.savedDBApp) {
      this.getCloudDocument();
      //this.getAllMainItemsForDocument();
    } else {
      this.getCloudDocument();
    }

    this._ApiService.get<SubItem[]>('subitems').subscribe(response => {
      this.subItemsRecords = response;
      this.loadingSubItems = false;
    });
  }

  getAllMainItemsForDocument() {
    this._ApiService.get<MainItem[]>(`mainitems/${this.documentNumber}`).subscribe({
      next: (res) => {
        this.mainItemsRecords = res.sort((a, b) => a.invoiceMainItemCode - b.invoiceMainItemCode);
        console.log(this.mainItemsRecords);
        this.loading = false;
        this.totalValue = this.mainItemsRecords.reduce((sum, record) => sum + record.totalWithProfit, 0);
        console.log('Total Value:', this.totalValue);

        // this.cdr.detectChanges();
      }, error: (err) => {
        console.log(err);
        console.log(err.status);
        if (err.status == 404) {
          this.mainItemsRecords = [];
          this.loading = false;
          this.totalValue = this.mainItemsRecords.reduce((sum, record) => sum + record.totalWithProfit, 0);
          console.log('Total Value:', this.totalValue);
          // this.cdr.detectChanges();
        }
      },
      complete: () => {
      }
    });
  }

  getCloudDocument() {
    this._ApiService.get<MainItem[]>(`mainitems/referenceid?referenceId=${this.documentNumber}`).subscribe({
      next: (res) => {
        // Set isPersisted to true for all items fetched from the database
        this.mainItemsRecords = res.map(item => ({ ...item, isPersisted: true }))
          .sort((a, b) => a.invoiceMainItemCode - b.invoiceMainItemCode);

        console.log(this.mainItemsRecords);
        this.loading = false;
        this.totalValue = this.mainItemsRecords.reduce((sum, record) => sum + record.totalWithProfit, 0);
        console.log('Total Value:', this.totalValue);
        // this.cdr.detectChanges();
      }, error: (err) => {
        console.log(err);
        console.log(err.status);
        if (err.status == 404) {
          this.mainItemsRecords = [];
          this.loading = false;
          this.totalValue = this.mainItemsRecords.reduce((sum, record) => sum + record.totalWithProfit, 0);
          console.log('Total Value:', this.totalValue);
          //this.cdr.detectChanges();
        }
      },
      complete: () => {
      }
    });
  }

  // For Add new  Main Item
  newMainItem: MainItem = {
    Type: '',
    invoiceMainItemCode: 0,
    serviceNumberCode: 0,
    description: "",
    quantity: 0,
    unitOfMeasurementCode: "",
    formulaCode: "",
    amountPerUnit: 0,
    currencyCode: "",
    total: 0,
    profitMargin: 0,
    totalWithProfit: 0,
    subItems: [],
    isPersisted: false
  };

  addMainItemInMemory() {

    if (!this.selectedServiceNumberRecord && !this.selectedFormulaRecord) { // if user didn't select serviceNumber && didn't select formula
      const newRecord: MainItem = {
        unitOfMeasurementCode: this.selectedUnitOfMeasure,
        currencyCode: this.selectedCurrency,
        description: this.newMainItem.description,
        quantity: this.newMainItem.quantity,
        amountPerUnit: this.newMainItem.amountPerUnit,
        total: this.newMainItem.total,
        profitMargin: this.newMainItem.profitMargin,
        totalWithProfit: this.newMainItem.totalWithProfit,
        temporaryDeletion: "temporary",
        referenceId: this.documentNumber,

        Type: '',
        invoiceMainItemCode: 0,
        subItems: [],
        isPersisted: false
      }
      console.log(newRecord);

      const bodyRequest: any = {
        quantity: newRecord.quantity,
        amountPerUnit: newRecord.amountPerUnit,
      };
      // Conditionally add profitMargin if it has a non-zero value
      if (newRecord.profitMargin && newRecord.profitMargin !== 0) {
        bodyRequest.profitMargin = newRecord.profitMargin;
      }
      // { quantity: newRecord.quantity, amountPerUnit: newRecord.amountPerUnit, profitMargin: newRecord.profitMargin ? newRecord.profitMargin : 0 }
      this._ApiService.post<any>(`/total`, bodyRequest).subscribe({
        next: (res) => {
          console.log('mainitem with total:', res);
          // this.totalValue = 0;
          newRecord.total = res.total;
          newRecord.amountPerUnitWithProfit = res.amountPerUnitWithProfit;
          newRecord.totalWithProfit = res.totalWithProfit;
          console.log(' Record:', newRecord);

          const filteredRecord = Object.fromEntries(
            Object.entries(newRecord).filter(([_, value]) => {
              return value !== '' && value !== 0 && value !== undefined && value !== null;
            })
          ) as MainItem;
          console.log('Filtered Record:', filteredRecord);

          this._InvoiceService.addMainItem(filteredRecord);

          //this.totalValue += filteredRecord.totalWithProfit;
          console.log(this.totalValue);

          this.savedInMemory = true;
          // this.cdr.detectChanges();

          const newMainItems = this._InvoiceService.getMainItems(this.documentNumber);

          console.log(newMainItems);


          // Combine the current mainItemsRecords with the new list, ensuring no duplicates
          this.mainItemsRecords = [
            ...this.mainItemsRecords.filter(item => !newMainItems.some(newItem => newItem.invoiceMainItemCode === item.invoiceMainItemCode)), // Remove existing items
            ...newMainItems
          ];

          this.updateTotalValueAfterAction();

          console.log(this.mainItemsRecords);
          this.resetNewMainItem();
          this.selectedUnitOfMeasure = "";
          this.selectedCurrency = "";

        }, error: (err) => {
          console.log(err);
        },
        complete: () => {
        }
      });

    }
    else if (!this.selectedServiceNumberRecord && this.selectedFormulaRecord && this.resultAfterTest) { // if user didn't select serviceNumber && select formula
      const newRecord: MainItem = {
        unitOfMeasurementCode: this.selectedUnitOfMeasure,
        currencyCode: this.selectedCurrency,
        formulaCode: this.selectedFormula,
        description: this.newMainItem.description,
        quantity: this.resultAfterTest,
        amountPerUnit: this.newMainItem.amountPerUnit,
        total: this.newMainItem.total,
        profitMargin: this.newMainItem.profitMargin,
        totalWithProfit: this.newMainItem.totalWithProfit,
        temporaryDeletion: "temporary",
        referenceId: this.documentNumber,
        Type: '',
        invoiceMainItemCode: 0,
        subItems: [],
        isPersisted: false
      }
      // if (this.resultAfterTest === 0 || this.newMainItem.description === "" || this.selectedCurrency === "") {
      //   // || this.newMainItem.unitOfMeasurementCode === ""  // till retrieved from cloud correctly
      //   this.messageService.add({
      //     severity: 'error',
      //     summary: 'Error',
      //     detail: 'Description & Quantity & Currency and UnitOfMeasurement are required',
      //     life: 3000
      //   });
      // }
      // else {
      console.log(newRecord);

      const bodyRequest: any = {
        quantity: newRecord.quantity,
        amountPerUnit: newRecord.amountPerUnit
      };

      // Conditionally add profitMargin if it has a non-zero value
      if (newRecord.profitMargin && newRecord.profitMargin !== 0) {
        bodyRequest.profitMargin = newRecord.profitMargin;
      }
      // { quantity: newRecord.quantity, amountPerUnit: newRecord.amountPerUnit, profitMargin: newRecord.profitMargin ? newRecord.profitMargin : 0 }
      this._ApiService.post<any>(`/total`, bodyRequest).subscribe({
        next: (res) => {
          console.log('mainitem with total:', res);
          // this.totalValue = 0;
          newRecord.total = res.total;
          newRecord.amountPerUnitWithProfit = res.amountPerUnitWithProfit;
          newRecord.totalWithProfit = res.totalWithProfit;
          const filteredRecord = Object.fromEntries(
            Object.entries(newRecord).filter(([_, value]) => {
              return value !== '' && value !== 0 && value !== undefined && value !== null;
            })
          ) as MainItem;
          console.log(filteredRecord);

          this._InvoiceService.addMainItem(filteredRecord);

          //this.totalValue += filteredRecord.totalWithProfit;
          console.log(this.totalValue);

          this.savedInMemory = true;
          // this.cdr.detectChanges();

          const newMainItems = this._InvoiceService.getMainItems(this.documentNumber);

          // Combine the current mainItemsRecords with the new list, ensuring no duplicates
          this.mainItemsRecords = [
            ...this.mainItemsRecords.filter(item => !newMainItems.some(newItem => newItem.invoiceMainItemCode === item.invoiceMainItemCode)), // Remove existing items
            ...newMainItems
          ];

          this.updateTotalValueAfterAction();

          console.log(this.mainItemsRecords);
          this.resetNewMainItem();
          this.selectedUnitOfMeasure = "";
          this.selectedCurrency = "";
          this.selectedFormula = "";
          this.selectedFormulaRecord = undefined;
          this.resultAfterTest = undefined;



        }, error: (err) => {
          console.log(err);
        },
        complete: () => {
        }
      });



    }
    else if (this.selectedServiceNumberRecord && !this.selectedFormulaRecord && !this.resultAfterTest) { // if user select serviceNumber && didn't select formula
      const newRecord: MainItem = {
        serviceNumberCode: this.selectedServiceNumber,
        unitOfMeasurementCode: this.selectedServiceNumberRecord.unitOfMeasurementCode,
        // this.selectedServiceNumberRecord.baseUnitOfMeasurement,
        currencyCode: this.selectedCurrency,
        description: this.selectedServiceNumberRecord.description,
        quantity: this.newMainItem.quantity,
        amountPerUnit: this.newMainItem.amountPerUnit,
        total: this.newMainItem.total,
        profitMargin: this.newMainItem.profitMargin,
        totalWithProfit: this.newMainItem.totalWithProfit,
        temporaryDeletion: "temporary",
        referenceId: this.documentNumber,
        Type: '',
        invoiceMainItemCode: 0,
        subItems: [],
        isPersisted: false
      }
      // if (this.newMainItem.quantity === 0 || this.selectedServiceNumberRecord.description === "" || this.selectedCurrency === "") {
      //   // || this.newMainItem.unitOfMeasurementCode === ""  // till retrieved from cloud correctly
      //   this.messageService.add({
      //     severity: 'error',
      //     summary: 'Error',
      //     detail: 'Description & Quantity & Currency and UnitOfMeasurement are required',
      //     life: 3000
      //   });
      // }
      // else {
      console.log(newRecord);

      const bodyRequest: any = {
        quantity: newRecord.quantity,
        amountPerUnit: newRecord.amountPerUnit
      };

      // Conditionally add profitMargin if it has a non-zero value
      if (newRecord.profitMargin && newRecord.profitMargin !== 0) {
        bodyRequest.profitMargin = newRecord.profitMargin;
      }
      // { quantity: newRecord.quantity, amountPerUnit: newRecord.amountPerUnit, profitMargin: newRecord.profitMargin ? newRecord.profitMargin : 0 }
      this._ApiService.post<any>(`/total`, bodyRequest).subscribe({
        next: (res) => {
          console.log('mainitem with total:', res);
          // this.totalValue = 0;
          newRecord.total = res.total;
          newRecord.amountPerUnitWithProfit = res.amountPerUnitWithProfit;
          newRecord.totalWithProfit = res.totalWithProfit;

          const filteredRecord = Object.fromEntries(
            Object.entries(newRecord).filter(([_, value]) => {
              return value !== '' && value !== 0 && value !== undefined && value !== null;
            })
          ) as MainItem;
          console.log(filteredRecord);

          this._InvoiceService.addMainItem(filteredRecord);

          //  this.totalValue += filteredRecord.totalWithProfit;
          console.log(this.totalValue);

          this.savedInMemory = true;
          // this.cdr.detectChanges();

          const newMainItems = this._InvoiceService.getMainItems(this.documentNumber);

          // Combine the current mainItemsRecords with the new list, ensuring no duplicates
          this.mainItemsRecords = [
            ...this.mainItemsRecords.filter(item => !newMainItems.some(newItem => newItem.invoiceMainItemCode === item.invoiceMainItemCode)), // Remove existing items
            ...newMainItems
          ];

          this.updateTotalValueAfterAction();

          console.log(this.mainItemsRecords);
          this.resetNewMainItem();
          this.selectedServiceNumberRecord = undefined;
        }, error: (err) => {
          console.log(err);
        },
        complete: () => {
        }
      });



    }
    else if (this.selectedServiceNumberRecord && this.selectedFormulaRecord && this.resultAfterTest) { // if user select serviceNumber && select formula
      const newRecord: MainItem = {
        serviceNumberCode: this.selectedServiceNumber,
        unitOfMeasurementCode: this.selectedServiceNumberRecord.unitOfMeasurementCode,
        // this.selectedServiceNumberRecord.baseUnitOfMeasurement,
        currencyCode: this.selectedCurrency,
        formulaCode: this.selectedFormula,
        description: this.selectedServiceNumberRecord.description,
        quantity: this.resultAfterTest,
        amountPerUnit: this.newMainItem.amountPerUnit,
        total: this.newMainItem.total,
        profitMargin: this.newMainItem.profitMargin,
        totalWithProfit: this.newMainItem.totalWithProfit,
        temporaryDeletion: "temporary",
        referenceId: this.documentNumber,
        Type: '',
        invoiceMainItemCode: 0,
        subItems: [],
        isPersisted: false
      }
      // if (this.resultAfterTest === 0 || this.selectedServiceNumberRecord.description === "" || this.selectedCurrency === "") {
      //   // || this.newMainItem.unitOfMeasurementCode === ""  // till retrieved from cloud correctly
      //   this.messageService.add({
      //     severity: 'error',
      //     summary: 'Error',
      //     detail: 'Description & Quantity & Currency and UnitOfMeasurement are required',
      //     life: 3000
      //   });
      // }
      // else {
      console.log(newRecord);

      const bodyRequest: any = {
        quantity: newRecord.quantity,
        amountPerUnit: newRecord.amountPerUnit
      };

      // Conditionally add profitMargin if it has a non-zero value
      if (newRecord.profitMargin && newRecord.profitMargin !== 0) {
        bodyRequest.profitMargin = newRecord.profitMargin;
      }
      // { quantity: newRecord.quantity, amountPerUnit: newRecord.amountPerUnit, profitMargin: newRecord.profitMargin ? newRecord.profitMargin : 0 }
      this._ApiService.post<any>(`/total`, bodyRequest).subscribe({
        next: (res) => {
          console.log('mainitem with total:', res);
          // this.totalValue = 0;
          newRecord.total = res.total;
          newRecord.amountPerUnitWithProfit = res.amountPerUnitWithProfit;
          newRecord.totalWithProfit = res.totalWithProfit;
          const filteredRecord = Object.fromEntries(
            Object.entries(newRecord).filter(([_, value]) => {
              return value !== '' && value !== 0 && value !== undefined && value !== null;
            })
          ) as MainItem;
          console.log(filteredRecord);

          this._InvoiceService.addMainItem(filteredRecord);

          // this.totalValue += filteredRecord.totalWithProfit;
          console.log(this.totalValue);

          this.savedInMemory = true;
          // this.cdr.detectChanges();

          const newMainItems = this._InvoiceService.getMainItems(this.documentNumber);

          // Combine the current mainItemsRecords with the new list, ensuring no duplicates
          this.mainItemsRecords = [
            ...this.mainItemsRecords.filter(item => !newMainItems.some(newItem => newItem.invoiceMainItemCode === item.invoiceMainItemCode)), // Remove existing items
            ...newMainItems
          ];

          this.updateTotalValueAfterAction();

          console.log(this.mainItemsRecords);
          this.resetNewMainItem();
          this.selectedServiceNumberRecord = undefined;
          this.selectedFormula = "";
          this.selectedFormulaRecord = undefined;
          this.selectedCurrency = "";
          this.resultAfterTest = undefined;

        }, error: (err) => {
          console.log(err);
        },
        complete: () => {
        }
      });


    }
  }

  addSubItemInMemory(mainItem: MainItem) {
    console.log(mainItem);
    if (!this.selectedServiceNumberRecordSubItem && !this.selectedFormulaRecordSubItem) { // if user didn't select serviceNumber && didn't select formula

      const newRecord: SubItem = {
        unitOfMeasurementCode: this.selectedUnitOfMeasureSubItem,
        currencyCode: this.selectedCurrencySubItem,
        description: this.newSubItem.description,
        quantity: this.newSubItem.quantity,
        amountPerUnit: this.newSubItem.amountPerUnit,
        Type: '',
        invoiceSubItemCode: Date.now(),
      }
      if (this.newSubItem.amountPerUnit === 0) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'AmountPerUnit is required',
          life: 3000
        });
      }
      else {
        console.log(newRecord);

        const bodyRequest: any = {
          quantity: newRecord.quantity,
          amountPerUnit: newRecord.amountPerUnit
        };
        this._ApiService.post<any>(`/total`, bodyRequest).subscribe({
          next: async (res) => {
            console.log('subitem with total:', res);
            newRecord.total = res.total;

            const filteredSubItem = Object.fromEntries(
              Object.entries(newRecord).filter(([_, value]) => {
                return value !== '' && value !== 0 && value !== undefined && value !== null;
              })
            ) as SubItem;
            console.log(filteredSubItem);

            const success = await this._InvoiceService.addSubItemToMainItem(mainItem.invoiceMainItemCode, filteredSubItem, this.documentNumber);
            if (success) {
              this.savedInMemory = true;
              console.log(this.mainItemsRecords);

              const mainItemIndex = this.mainItemsRecords.findIndex(item => item.invoiceMainItemCode === mainItem.invoiceMainItemCode);
              console.log(mainItemIndex);
              this.cdr.detectChanges();
              if (mainItemIndex > -1) {


                const subItemsArray = Array.from(Object.values(this.mainItemsRecords[mainItemIndex].subItems).slice(0, this.mainItemsRecords[mainItemIndex].subItems.length));
                console.log('Converted Array:', subItemsArray);
                console.log('Array Length:', subItemsArray.length);

                console.log(this.mainItemsRecords[mainItemIndex]?.subItems?.length);
                console.log(this.mainItemsRecords[mainItemIndex].subItems);
                console.log(this.mainItemsRecords[mainItemIndex].subItems.values);
                console.log(this.mainItemsRecords[mainItemIndex].subItems.length);
                // console.log(this.mainItemsRecords[mainItemIndex].subItems);

                var size = Object.keys(this.mainItemsRecords[mainItemIndex].subItems).length;
                console.log(size);



                if (this.mainItemsRecords[mainItemIndex]?.subItems?.length > 0) {
                  const rawSubItems = this.mainItemsRecords[mainItemIndex].subItems;
                  rawSubItems.forEach(subItem => {
                    console.log('SubItem:', subItem);
                  });
                } else {
                  console.log('No subitems found for this MainItem.');
                }



                const subItemsCloned = JSON.parse(JSON.stringify(this.mainItemsRecords[mainItemIndex].subItems));
                console.log('Deep Cloned SubItems:', subItemsCloned);

                const subItemsToArray = Object.values(subItemsCloned);
                console.log('Final SubItems Array:', subItemsToArray, 'Length:', subItemsToArray.length);


                // let copy = [];
                let copy = Array.isArray(this.mainItemsRecords[mainItemIndex].subItems)
                  ? this.mainItemsRecords[mainItemIndex].subItems
                  : Object.values(this.mainItemsRecords[mainItemIndex].subItems);

                console.log('SubItems after conversion:', copy);
                console.log('SubItems length after conversion:', copy.length);

                console.log('SubItems hasOwnProperty "length":', this.mainItemsRecords[mainItemIndex].subItems.hasOwnProperty('length'));

                // delete copy.length; // Remove any invalid length property
                copy = Array.from(copy); // Convert to a proper array
                console.log('Fixed Array:', copy, 'Length:', copy.length);

                //  copy = this.mainItemsRecords[mainItemIndex].subItems;
                //  console.log('SubItems before condition:', copy);
                //  console.log('SubItems before condition length:', copy.length);
                if (this.mainItemsRecords[mainItemIndex]?.subItems?.length > 0) {
                  copy = this.mainItemsRecords[mainItemIndex].subItems;
                  console.log('SubItems:', copy);
                  console.log('Length:', copy.length);
                } else {
                  console.log('SubItems are not ready or empty.');
                }

                // Ensure subItems array exists
                if (!this.mainItemsRecords[mainItemIndex].subItems) {
                  console.error('SubItems array is undefined. Initializing...');
                  this.mainItemsRecords[mainItemIndex].subItems = [];
                }



                console.log('MainItem:', this.mainItemsRecords[mainItemIndex]);
                console.log('SubItems before find:', this.mainItemsRecords[mainItemIndex].subItems);

                const filteredCode = filteredSubItem['invoiceSubItemCode'];
                console.log('Filtered SubItem Code:', filteredCode, typeof filteredCode);
                this.mainItemsRecords[mainItemIndex].subItems.forEach(subItem => {
                  console.log(
                    'Type of subItem.invoiceSubItemCode:', typeof subItem.invoiceSubItemCode, subItem.invoiceSubItemCode
                  );
                });

                console.log(mainItemIndex);
                // Check if subitem already exists by comparing invoiceSubItemCode


                let match = null;


                this.mainItemsRecords[mainItemIndex].subItems.forEach(subItem => {
                  console.log('Comparing:', subItem.invoiceSubItemCode, 'with', filteredCode);
                  // if (Number(subItem.invoiceSubItemCode) === Number(filteredSubItem['invoiceSubItemCode'])) {
                  //   match = subItem;
                  // }
                });
                console.log('Match Found:', match);
                // Check if subitem already exists by comparing invoiceSubItemCode
                const existingSubItem = this.mainItemsRecords[mainItemIndex].subItems.find(
                  subItem => String(subItem.invoiceSubItemCode).trim() === String(filteredSubItem['invoiceSubItemCode']).trim()
                  //String(subItem.invoiceSubItemCode) === String(filteredSubItem['invoiceSubItemCode'])
                );

                console.log('Existing SubItem:', existingSubItem);

                if (!existingSubItem) {
                  this.mainItemsRecords[mainItemIndex].subItems.push(filteredSubItem as SubItem);
                  console.log(this.mainItemsRecords);
                }
                // else {
                console.log('Duplicate subitem detected; skipping addition.');
                console.log(this.mainItemsRecords);
                ///......
                // Calculate the sum of total values for all subitems
                const totalOfSubItems = this.mainItemsRecords[mainItemIndex].subItems.reduce(
                  (sum, subItem) => sum + (subItem.total || 0),
                  0
                );
                this.mainItemsRecords[mainItemIndex].amountPerUnit = totalOfSubItems;
                console.log(
                  `Updated MainItem (ID: ${mainItem.invoiceMainItemCode}) AmountPerUnit:`,
                  this.mainItemsRecords[mainItemIndex].amountPerUnit
                );

                // Recalculate the main item's total, amountPerUnitWithProfit, and totalWithProfit
                const recalculateBodyRequest = {
                  quantity: this.mainItemsRecords[mainItemIndex].quantity,
                  amountPerUnit: totalOfSubItems,
                };

                this._ApiService.post<any>(`/total`, recalculateBodyRequest).subscribe({
                  next: (recalculateRes) => {
                    console.log('Updated main item totals:', recalculateRes);

                    this.mainItemsRecords[mainItemIndex] = {
                      ...this.mainItemsRecords[mainItemIndex],
                      total: recalculateRes.totalWithProfit,
                      amountPerUnitWithProfit: recalculateRes.amountPerUnitWithProfit,
                      totalWithProfit: recalculateRes.totalWithProfit,
                    };

                    console.log(
                      `Recalculated MainItem (ID: ${mainItem.invoiceMainItemCode}):`,
                      this.mainItemsRecords[mainItemIndex]
                    );
                    this.updateTotalValueAfterAction();

                    // this.cdr.detectChanges();
                  },
                  error: (err) => {
                    console.error('Failed to recalculate totals:', err);
                  },
                });
                ///......
              }
              // }
              this.resetNewSubItem();
              this.selectedUnitOfMeasureSubItem = "";
              this.selectedCurrencySubItem = "";
              // this.cdr.detectChanges(); // Trigger change detection if needed
              console.log(this.mainItemsRecords);
            }

          }, error: (err) => {
            console.log(err);
          },
          complete: () => {
          }
        });
      }
    }
    else if (!this.selectedServiceNumberRecordSubItem && this.selectedFormulaRecordSubItem && this.resultAfterTest) { // if user didn't select serviceNumber && select formula
      const newRecord: SubItem = {
        unitOfMeasurementCode: this.selectedUnitOfMeasureSubItem,
        currencyCode: this.selectedCurrencySubItem,
        formulaCode: this.selectedFormulaSubItem,
        description: this.newSubItem.description,
        quantity: this.resultAfterTest,
        amountPerUnit: this.newSubItem.amountPerUnit,
        Type: '',
        invoiceSubItemCode: Date.now(),
      }
      if (this.newSubItem.amountPerUnit === 0) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'AmountPerUnit is required',
          life: 3000
        });
      }
      else {
        console.log(newRecord)


        const bodyRequest: any = {
          quantity: newRecord.quantity,
          amountPerUnit: newRecord.amountPerUnit
        };

        this._ApiService.post<any>(`/total`, bodyRequest).subscribe({
          next: async (res) => {
            console.log('subitem with total:', res);
            // this.totalValue = 0;
            newRecord.total = res.total;
            const filteredSubItem = Object.fromEntries(
              Object.entries(newRecord).filter(([_, value]) => {
                return value !== '' && value !== 0 && value !== undefined && value !== null;
              })
            );
            console.log(filteredSubItem);

            const success = await this._InvoiceService.addSubItemToMainItem(mainItem.invoiceMainItemCode, filteredSubItem as SubItem, this.documentNumber);
            if (success) {

              this.savedInMemory = true;

              const mainItemIndex = this.mainItemsRecords.findIndex(item => item.invoiceMainItemCode === mainItem.invoiceMainItemCode);

              if (mainItemIndex > -1) {
                // Check if subitem already exists by comparing invoiceSubItemCode
                const existingSubItem = this.mainItemsRecords[mainItemIndex].subItems.find(
                  subItem => subItem.invoiceSubItemCode === filteredSubItem['invoiceSubItemCode']
                );
                if (!existingSubItem) {
                  this.mainItemsRecords[mainItemIndex].subItems.push(filteredSubItem as SubItem);
                  console.log(this.mainItemsRecords);

                }
                //else {
                console.log('Duplicate subitem detected; skipping addition.');
                console.log(this.mainItemsRecords);
                ///......
                // Calculate the sum of total values for all subitems
                const totalOfSubItems = this.mainItemsRecords[mainItemIndex].subItems.reduce(
                  (sum, subItem) => sum + (subItem.total || 0),
                  0
                );
                this.mainItemsRecords[mainItemIndex].amountPerUnit = totalOfSubItems;
                console.log(
                  `Updated MainItem (ID: ${mainItem.invoiceMainItemCode}) AmountPerUnit:`,
                  this.mainItemsRecords[mainItemIndex].amountPerUnit
                );

                // Recalculate the main item's total, amountPerUnitWithProfit, and totalWithProfit
                const recalculateBodyRequest = {
                  quantity: this.mainItemsRecords[mainItemIndex].quantity,
                  amountPerUnit: totalOfSubItems,
                };

                this._ApiService.post<any>(`/total`, recalculateBodyRequest).subscribe({
                  next: (recalculateRes) => {
                    console.log('Updated main item totals:', recalculateRes);

                    this.mainItemsRecords[mainItemIndex] = {
                      ...this.mainItemsRecords[mainItemIndex],
                      total: recalculateRes.totalWithProfit,
                      amountPerUnitWithProfit: recalculateRes.amountPerUnitWithProfit,
                      totalWithProfit: recalculateRes.totalWithProfit,
                    };

                    console.log(
                      `Recalculated MainItem (ID: ${mainItem.invoiceMainItemCode}):`,
                      this.mainItemsRecords[mainItemIndex]
                    );
                    this.updateTotalValueAfterAction();

                    // this.cdr.detectChanges();
                  },
                  error: (err) => {
                    console.error('Failed to recalculate totals:', err);
                  },
                });
                ///......
                //}
              }
              this.resetNewSubItem();
              this.selectedUnitOfMeasureSubItem = "";
              this.selectedCurrencySubItem = "";
              this.selectedFormulaSubItem = "";
              this.selectedFormulaRecordSubItem = undefined
              this.resultAfterTest = undefined;
              //  this.cdr.detectChanges(); // Trigger change detection if needed
              console.log(this.mainItemsRecords);
            }
          }, error: (err) => {
            console.log(err);
          },
          complete: () => {
          }
        });




      }
    }
    else if (this.selectedServiceNumberRecordSubItem && !this.selectedFormulaRecordSubItem && !this.resultAfterTest) { // if user select serviceNumber && didn't select formula

      const newRecord: SubItem = {
        serviceNumberCode: this.selectedServiceNumberSubItem,
        unitOfMeasurementCode: this.selectedServiceNumberRecordSubItem.unitOfMeasurementCode,
        //this.selectedServiceNumberRecordSubItem.baseUnitOfMeasurement,
        currencyCode: this.selectedCurrencySubItem,
        description: this.selectedServiceNumberRecordSubItem.description,
        quantity: this.newSubItem.quantity,
        amountPerUnit: this.newSubItem.amountPerUnit,
        Type: '',
        invoiceSubItemCode: Date.now(),
      }

      if (this.newSubItem.amountPerUnit === 0) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'AmountPerUnit is required',
          life: 3000
        });
      }
      else {
        console.log(newRecord);

        const bodyRequest: any = {
          quantity: newRecord.quantity,
          amountPerUnit: newRecord.amountPerUnit
        };

        this._ApiService.post<any>(`/total`, bodyRequest).subscribe({
          next: async (res) => {
            console.log('subitem with total:', res);
            // this.totalValue = 0;
            newRecord.total = res.total;
            const filteredSubItem = Object.fromEntries(
              Object.entries(newRecord).filter(([_, value]) => {
                return value !== '' && value !== 0 && value !== undefined && value !== null;
              })
            );
            console.log(filteredSubItem);

            const success = await this._InvoiceService.addSubItemToMainItem(mainItem.invoiceMainItemCode, filteredSubItem as SubItem, this.documentNumber);
            if (success) {

              this.savedInMemory = true;

              const mainItemIndex = this.mainItemsRecords.findIndex(item => item.invoiceMainItemCode === mainItem.invoiceMainItemCode);

              if (mainItemIndex > -1) {
                // Check if subitem already exists by comparing invoiceSubItemCode
                const existingSubItem = this.mainItemsRecords[mainItemIndex].subItems.find(
                  subItem => subItem.invoiceSubItemCode === filteredSubItem['invoiceSubItemCode']
                );
                if (!existingSubItem) {
                  this.mainItemsRecords[mainItemIndex].subItems.push(filteredSubItem as SubItem);
                  console.log(this.mainItemsRecords);

                }
                //else {
                console.log('Duplicate subitem detected; skipping addition.');
                console.log(this.mainItemsRecords);
                ///......
                // Calculate the sum of total values for all subitems
                const totalOfSubItems = this.mainItemsRecords[mainItemIndex].subItems.reduce(
                  (sum, subItem) => sum + (subItem.total || 0),
                  0
                );
                this.mainItemsRecords[mainItemIndex].amountPerUnit = totalOfSubItems;
                console.log(
                  `Updated MainItem (ID: ${mainItem.invoiceMainItemCode}) AmountPerUnit:`,
                  this.mainItemsRecords[mainItemIndex].amountPerUnit
                );

                // Recalculate the main item's total, amountPerUnitWithProfit, and totalWithProfit
                const recalculateBodyRequest = {
                  quantity: this.mainItemsRecords[mainItemIndex].quantity,
                  amountPerUnit: totalOfSubItems,
                };

                this._ApiService.post<any>(`/total`, recalculateBodyRequest).subscribe({
                  next: (recalculateRes) => {
                    console.log('Updated main item totals:', recalculateRes);

                    this.mainItemsRecords[mainItemIndex] = {
                      ...this.mainItemsRecords[mainItemIndex],
                      total: recalculateRes.totalWithProfit,
                      amountPerUnitWithProfit: recalculateRes.amountPerUnitWithProfit,
                      totalWithProfit: recalculateRes.totalWithProfit,
                    };

                    console.log(
                      `Recalculated MainItem (ID: ${mainItem.invoiceMainItemCode}):`,
                      this.mainItemsRecords[mainItemIndex]
                    );

                    this.updateTotalValueAfterAction();

                    // this.cdr.detectChanges();
                  },
                  error: (err) => {
                    console.error('Failed to recalculate totals:', err);
                  },
                });
                ///......
                // }
              }
              this.resetNewSubItem();
              this.selectedCurrencySubItem = "";
              this.selectedFormulaRecordSubItem = undefined;
              this.selectedServiceNumberRecordSubItem = undefined
              //  this.cdr.detectChanges(); // Trigger change detection if needed
              console.log(this.mainItemsRecords);
            }
          }, error: (err) => {
            console.log(err);
          },
          complete: () => {
          }
        });


      }
    }

    else if (this.selectedServiceNumberRecordSubItem && this.selectedFormulaRecordSubItem && this.resultAfterTest) { // if user select serviceNumber && select formula
      const newRecord: SubItem = {
        serviceNumberCode: this.selectedServiceNumberSubItem,
        unitOfMeasurementCode: this.selectedServiceNumberRecordSubItem.unitOfMeasurementCode,
        //this.selectedServiceNumberRecordSubItem.baseUnitOfMeasurement,
        currencyCode: this.selectedCurrencySubItem,
        formulaCode: this.selectedFormulaSubItem,
        description: this.selectedServiceNumberRecordSubItem.description,
        quantity: this.resultAfterTest,
        amountPerUnit: this.newSubItem.amountPerUnit,
        Type: '',
        invoiceSubItemCode: Date.now(),
      }
      if (this.newSubItem.amountPerUnit === 0) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'AmountPerUnit is required',
          life: 3000
        });
      }
      else {
        console.log(newRecord);


        const bodyRequest: any = {
          quantity: newRecord.quantity,
          amountPerUnit: newRecord.amountPerUnit
        };

        this._ApiService.post<any>(`/total`, bodyRequest).subscribe({
          next: async (res) => {
            console.log('subitem with total:', res);
            // this.totalValue = 0;
            newRecord.total = res.total;
            const filteredSubItem = Object.fromEntries(
              Object.entries(newRecord).filter(([_, value]) => {
                return value !== '' && value !== 0 && value !== undefined && value !== null;
              })
            );
            console.log(filteredSubItem);

            const success = await this._InvoiceService.addSubItemToMainItem(mainItem.invoiceMainItemCode, filteredSubItem as SubItem, this.documentNumber);
            if (success) {

              this.savedInMemory = true;

              const mainItemIndex = this.mainItemsRecords.findIndex(item => item.invoiceMainItemCode === mainItem.invoiceMainItemCode);

              if (mainItemIndex > -1) {
                // Check if subitem already exists by comparing invoiceSubItemCode
                const existingSubItem = this.mainItemsRecords[mainItemIndex].subItems.find(
                  subItem => subItem.invoiceSubItemCode === filteredSubItem['invoiceSubItemCode']
                );
                if (!existingSubItem) {
                  this.mainItemsRecords[mainItemIndex].subItems.push(filteredSubItem as SubItem);
                  console.log(this.mainItemsRecords);

                }
                //else {
                console.log('Duplicate subitem detected; skipping addition.');
                console.log(this.mainItemsRecords);
                ///......
                // Calculate the sum of total values for all subitems
                const totalOfSubItems = this.mainItemsRecords[mainItemIndex].subItems.reduce(
                  (sum, subItem) => sum + (subItem.total || 0),
                  0
                );
                this.mainItemsRecords[mainItemIndex].amountPerUnit = totalOfSubItems;
                console.log(
                  `Updated MainItem (ID: ${mainItem.invoiceMainItemCode}) AmountPerUnit:`,
                  this.mainItemsRecords[mainItemIndex].amountPerUnit
                );

                // Recalculate the main item's total, amountPerUnitWithProfit, and totalWithProfit
                const recalculateBodyRequest = {
                  quantity: this.mainItemsRecords[mainItemIndex].quantity,
                  amountPerUnit: totalOfSubItems,
                };

                this._ApiService.post<any>(`/total`, recalculateBodyRequest).subscribe({
                  next: (recalculateRes) => {
                    console.log('Updated main item totals:', recalculateRes);

                    this.mainItemsRecords[mainItemIndex] = {
                      ...this.mainItemsRecords[mainItemIndex],
                      total: recalculateRes.totalWithProfit,
                      amountPerUnitWithProfit: recalculateRes.amountPerUnitWithProfit,
                      totalWithProfit: recalculateRes.totalWithProfit,
                    };

                    console.log(
                      `Recalculated MainItem (ID: ${mainItem.invoiceMainItemCode}):`,
                      this.mainItemsRecords[mainItemIndex]
                    );
                    this.updateTotalValueAfterAction();

                    // this.cdr.detectChanges();
                  },
                  error: (err) => {
                    console.error('Failed to recalculate totals:', err);
                  },
                });
                ///......
                //}
              }
              this.resetNewSubItem();
              this.selectedCurrencySubItem = "";
              this.selectedFormulaRecordSubItem = undefined
              this.resultAfterTest = undefined;
              this.selectedServiceNumberRecordSubItem = undefined
              // this.cdr.detectChanges(); // Trigger change detection if needed
              console.log(this.mainItemsRecords);
            }
          }, error: (err) => {
            console.log(err);
          },
          complete: () => {
          }
        });

      }
    }
  }

  saveDocument() {
    this.confirmationService.confirm({
      message: 'Are you sure you want to save the document?',
      header: 'Confirm Saving ',
      // icon: 'pi pi-exclamation-triangle',
      accept: () => {
        console.log(this.mainItemsRecords);

        const saveRequests = this.mainItemsRecords.map((item) => ({
          refrenceId: this.documentNumber,
          subItems: (item.subItems ?? []).map(subItem =>
            this.removeProperties(subItem, ['invoiceMainItemCode', 'invoiceSubItemCode', 'selected'])
          ),
          quantity: item.quantity,
          amountPerUnit: item.amountPerUnit,
          serviceNumberCode: item.serviceNumberCode,
          unitOfMeasurementCode: item.unitOfMeasurementCode,
          currencyCode: item.currencyCode,
          formulaCode: item.formulaCode,
          description: item.description,
          total: item.total,
          profitMargin: item.profitMargin,
          totalWithProfit: item.totalWithProfit,
        }));
        console.log(saveRequests);
        // Set dynamic parameters for URL
        const url = `/mainitems?salesQuotation=${this.documentNumber}&salesQuotationItem=${this.itemNumber}&pricingProcedureStep=20&pricingProcedureCounter=1&customerNumber=${this.customerId}`;
        // Send the array of bodyRequest objects to the server in a single POST request
        this._ApiService.post<MainItem[]>(url, saveRequests).subscribe({
          next: (res) => {
            console.log('All main items saved successfully:', res);
            this.mainItemsRecords = res;
            this.updateTotalValueAfterAction();
            const lastRecord = res[res.length - 1];
            // this.savedDBApp =true;
            // this.totalValue = 0;
            // this.totalValue = lastRecord.totalHeader ? lastRecord.totalHeader : 0;
            // this.ngOnInit();
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'The Document has been saved successfully',
              life: 3000
            });

          }, error: (err) => {
            console.error('Error saving main items:', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Error saving The Document',
              life: 3000
            });
          },
          complete: () => {
            // this.ngOnInit();
          }

        })
      }, reject: () => {
      }
    });
  }

  // For Add new  Sub Item
  newSubItem: SubItem = {
    Type: '',
    invoiceSubItemCode: 0,
    // invoiceMainItemCode: 0,
    serviceNumberCode: 0,
    description: "",
    quantity: 0,
    unitOfMeasurementCode: "",
    formulaCode: "",
    amountPerUnit: 0,
    currencyCode: "",
    total: 0
  };

  // For Edit  MainItem
  clonedMainItem: { [s: number]: MainItem } = {};
  onMainItemEditInit(record: MainItem) {
    this.clonedMainItem[record.invoiceMainItemCode] = { ...record };
  }
  onMainItemEditSave(index: number, record: MainItem) {
    console.log(record);

    const { invoiceMainItemCode, total, totalWithProfit, ...mainItemWithoutMainItemCode } = record;
    const updatedMainItem = this.removePropertiesFrom(mainItemWithoutMainItemCode, ['invoiceMainItemCode', 'invoiceSubItemCode']);
    console.log(updatedMainItem);

    console.log(this.updateSelectedServiceNumber);
    if (this.updateSelectedServiceNumberRecord) {
      const newRecord: MainItem = {
        ...record, // Copy all properties from the original record
        subItems: (record?.subItems ?? []).map(subItem =>
          this.removeProperties(subItem, ['invoiceMainItemCode', 'invoiceSubItemCode'])
        ),
        unitOfMeasurementCode: this.updateSelectedServiceNumberRecord.unitOfMeasurementCode,
        //this.updateSelectedServiceNumberRecord.baseUnitOfMeasurement,
        description: this.updateSelectedServiceNumberRecord.description,
      };
      console.log(newRecord);
      //....................
      const bodyRequest: any = {
        quantity: newRecord.quantity,
        amountPerUnit: newRecord.amountPerUnit
      };

      if (newRecord.profitMargin && newRecord.profitMargin !== 0) {
        bodyRequest.profitMargin = newRecord.profitMargin;
      }
      this._ApiService.post<any>(`/total`, bodyRequest).subscribe({
        next: (res) => {
          console.log('mainitem with total:', res);
          newRecord.total = res.total;
          newRecord.amountPerUnitWithProfit = res.amountPerUnitWithProfit;
          newRecord.totalWithProfit = res.totalWithProfit;
          const mainItemIndex = this.mainItemsRecords.findIndex(item => item.invoiceMainItemCode === invoiceMainItemCode);
          if (mainItemIndex > -1) {
            this.mainItemsRecords[mainItemIndex] = { ...this.mainItemsRecords[mainItemIndex], ...newRecord };
            this.updateTotalValueAfterAction();
          }
          // this.cdr.detectChanges();
          console.log(this.mainItemsRecords);
        }, error: (err) => {
          console.log(err);
        },
        complete: () => {
        }
      });
      ///...................

      // // Update mainItemsRecords array in the component to reflect the changes
      // const mainItemIndex = this.mainItemsRecords.findIndex(item => item.invoiceMainItemCode === invoiceMainItemCode);
      // if (mainItemIndex > -1) {
      //   // Update the specific MainItem in the array
      //   this.mainItemsRecords[mainItemIndex] = { ...this.mainItemsRecords[mainItemIndex], ...newRecord };
      // }
      // // this.updateSelectedServiceNumberRecord=undefined;
      // // Trigger change detection
      // this.cdr.detectChanges();
      // console.log(this.mainItemsRecords);
    }
    if (this.updateSelectedServiceNumberRecord && this.updatedFormulaRecord && this.resultAfterTestUpdate) {
      console.log(record);
      console.log(this.updateSelectedServiceNumberRecord);
      const newRecord: MainItem = {
        ...record,
        subItems: (record?.subItems ?? []).map(subItem =>
          this.removeProperties(subItem, ['invoiceMainItemCode', 'invoiceSubItemCode'])
        ),
        unitOfMeasurementCode: this.updateSelectedServiceNumberRecord.unitOfMeasurementCode,
        // this.updateSelectedServiceNumberRecord.baseUnitOfMeasurement,
        description: this.updateSelectedServiceNumberRecord.description,
        quantity: this.resultAfterTestUpdate,
      };
      console.log(newRecord);

      //....................
      const bodyRequest: any = {
        quantity: newRecord.quantity,
        amountPerUnit: newRecord.amountPerUnit
      };

      // Conditionally add profitMargin if it has a non-zero value
      if (newRecord.profitMargin && newRecord.profitMargin !== 0) {
        bodyRequest.profitMargin = newRecord.profitMargin;
      }
      // { quantity: newRecord.quantity, amountPerUnit: newRecord.amountPerUnit, profitMargin: newRecord.profitMargin ? newRecord.profitMargin : 0 }
      this._ApiService.post<any>(`/total`, bodyRequest).subscribe({
        next: (res) => {
          console.log('mainitem with total:', res);
          // this.totalValue = 0;
          newRecord.total = res.total;
          newRecord.amountPerUnitWithProfit = res.amountPerUnitWithProfit;
          newRecord.totalWithProfit = res.totalWithProfit;

          // Update mainItemsRecords array in the component to reflect the changes
          const mainItemIndex = this.mainItemsRecords.findIndex(item => item.invoiceMainItemCode === invoiceMainItemCode);
          if (mainItemIndex > -1) {
            // Update the specific MainItem in the array
            this.mainItemsRecords[mainItemIndex] = { ...this.mainItemsRecords[mainItemIndex], ...newRecord };
            this.updateTotalValueAfterAction();
          }
          this.updatedFormulaRecord = undefined;
          this.resultAfterTestUpdate = undefined
          // Trigger change detection
          //this.cdr.detectChanges();
          console.log(this.mainItemsRecords);
        }, error: (err) => {
          console.log(err);
        },
        complete: () => {
        }
      });
      ///...................

      // // Update mainItemsRecords array in the component to reflect the changes
      // const mainItemIndex = this.mainItemsRecords.findIndex(item => item.invoiceMainItemCode === invoiceMainItemCode);
      // if (mainItemIndex > -1) {
      //   // Update the specific MainItem in the array
      //   this.mainItemsRecords[mainItemIndex] = { ...this.mainItemsRecords[mainItemIndex], ...newRecord };
      // }
      // this.updatedFormulaRecord = undefined;
      // this.resultAfterTestUpdate = undefined
      // // Trigger change detection
      // this.cdr.detectChanges();
      // console.log(this.mainItemsRecords);
    }
    if (this.updatedFormulaRecord && this.resultAfterTestUpdate) {
      const newRecord: MainItem = {
        ...record,
        subItems: (record?.subItems ?? []).map(subItem =>
          this.removeProperties(subItem, ['invoiceMainItemCode', 'invoiceSubItemCode'])
        ),
        quantity: this.resultAfterTestUpdate,
      };
      console.log(newRecord);

      //....................
      const bodyRequest: any = {
        quantity: newRecord.quantity,
        amountPerUnit: newRecord.amountPerUnit
      };

      // Conditionally add profitMargin if it has a non-zero value
      if (newRecord.profitMargin && newRecord.profitMargin !== 0) {
        bodyRequest.profitMargin = newRecord.profitMargin;
      }
      // { quantity: newRecord.quantity, amountPerUnit: newRecord.amountPerUnit, profitMargin: newRecord.profitMargin ? newRecord.profitMargin : 0 }
      this._ApiService.post<any>(`/total`, bodyRequest).subscribe({
        next: (res) => {
          console.log('mainitem with total:', res);
          // this.totalValue = 0;
          newRecord.total = res.total;
          newRecord.amountPerUnitWithProfit = res.amountPerUnitWithProfit;
          newRecord.totalWithProfit = res.totalWithProfit;

          // Update mainItemsRecords array in the component to reflect the changes
          const mainItemIndex = this.mainItemsRecords.findIndex(item => item.invoiceMainItemCode === invoiceMainItemCode);
          if (mainItemIndex > -1) {
            // Update the specific MainItem in the array
            this.mainItemsRecords[mainItemIndex] = { ...this.mainItemsRecords[mainItemIndex], ...newRecord };
            this.updateTotalValueAfterAction();
          }
          this.updatedFormulaRecord = undefined;
          this.resultAfterTestUpdate = undefined
          // Trigger change detection
          //this.cdr.detectChanges();
          console.log(this.mainItemsRecords);
        }, error: (err) => {
          console.log(err);
        },
        complete: () => {
        }
      });
      ///...................

      // // Update mainItemsRecords array in the component to reflect the changes
      // const mainItemIndex = this.mainItemsRecords.findIndex(item => item.invoiceMainItemCode === invoiceMainItemCode);
      // if (mainItemIndex > -1) {
      //   // Update the specific MainItem in the array
      //   this.mainItemsRecords[mainItemIndex] = { ...this.mainItemsRecords[mainItemIndex], ...newRecord };
      // }
      // this.updatedFormulaRecord = undefined;
      // this.resultAfterTestUpdate = undefined
      // // Trigger change detection
      // this.cdr.detectChanges();
      // console.log(this.mainItemsRecords);

    }
    if (!this.updateSelectedServiceNumberRecord && !this.updatedFormulaRecord && !this.resultAfterTestUpdate) {
      console.log({ ...mainItemWithoutMainItemCode });

      //....................
      const bodyRequest: any = {
        quantity: updatedMainItem.quantity,
        amountPerUnit: updatedMainItem.amountPerUnit
      };
      if (updatedMainItem.profitMargin && updatedMainItem.profitMargin !== 0) {
        bodyRequest.profitMargin = updatedMainItem.profitMargin;
      }
      this._ApiService.post<any>(`/total`, bodyRequest).subscribe({
        next: (res) => {
          console.log('mainitem with total:', res);
          updatedMainItem.total = res.total;
          updatedMainItem.amountPerUnitWithProfit = res.amountPerUnitWithProfit;
          updatedMainItem.totalWithProfit = res.totalWithProfit;
          const mainItemIndex = this.mainItemsRecords.findIndex(item => item.invoiceMainItemCode === invoiceMainItemCode);
          if (mainItemIndex > -1) {
            this.mainItemsRecords[mainItemIndex] = { ...this.mainItemsRecords[mainItemIndex], ...updatedMainItem };
            this.updateTotalValueAfterAction();
          }
          // this.cdr.detectChanges();
          console.log(this.mainItemsRecords);
        }, error: (err) => {
          console.log(err);
        },
        complete: () => {
        }
      });
      ///...................

      // // Update mainItemsRecords array in the component to reflect the changes
      // const mainItemIndex = this.mainItemsRecords.findIndex(item => item.invoiceMainItemCode === invoiceMainItemCode);
      // if (mainItemIndex > -1) {
      //   // Update the specific MainItem in the array
      //   this.mainItemsRecords[mainItemIndex] = { ...this.mainItemsRecords[mainItemIndex], ...updatedMainItem };
      // }
      // // Trigger change detection
      // this.cdr.detectChanges();
      // console.log(this.mainItemsRecords);
    }
  }

  onMainItemEditCancel(row: MainItem, index: number) {
    this.mainItemsRecords[index] = this.clonedMainItem[row.invoiceMainItemCode]
    delete this.clonedMainItem[row.invoiceMainItemCode]
  }

  // For Edit  SubItem
  clonedSubItem: { [s: number]: SubItem } = {};
  onSubItemEditInit(record: SubItem, index: number) {

    console.log(index);

    console.log(record);
    console.log('Before reset:', this.clonedSubItem);

    // Ensure invoiceSubItemCode exists
    if (!index) {
      console.error('Error: invoiceSubItemCode is undefined for the record:', record);
      return; // Stop further execution if key is invalid
    }

    // Clear the clonedSubItem object before adding the new subitem
    this.clonedSubItem = {};
    // this.clonedSubItem = { [index]: { ...record } }; // Force new reference
    // this.cdr.detectChanges(); // Trigger change detection


    console.log('After reset:', this.clonedSubItem);


    console.log(this.clonedSubItem);
    if (record.invoiceSubItemCode) {
      if (!this.clonedSubItem[record.invoiceSubItemCode]) {
        this.clonedSubItem[record.invoiceSubItemCode] = { ...record };
      }
      // this.clonedSubItem[record.invoiceSubItemCode] = { ...record };
    }
    // Reassign to force change detection
    // this.clonedSubItem = { ...this.clonedSubItem };

    console.log('After adding record:', this.clonedSubItem);
  }
  //new...
  onSubItemEditSave(index: number, record: SubItem, mainItem: MainItem) {
    // Ensure record and mainItem are valid
    if (!record || !record.invoiceSubItemCode) {
      console.error('Error: Invalid SubItem record or missing invoiceSubItemCode:', record);
      return;
    }
    if (!mainItem) {
      console.error('Error: Invalid MainItem:', mainItem);
      return;
    }

    const id = record.invoiceSubItemCode; // Extract `invoiceSubItemCode` once
    console.log('SubItem Edit Save - Record:', record, 'MainItem:', mainItem, 'Index:', index, 'ID:', id);

    // Clone record to avoid mutations
    const clonedRecord = { ...record };

    if (this.updateSelectedServiceNumberRecordSubItem) {
      // Create a new subitem record with additional data
      const newRecord: SubItem = {
        ...clonedRecord,
        unitOfMeasurementCode: this.updateSelectedServiceNumberRecordSubItem.unitOfMeasurementCode,
        description: this.updateSelectedServiceNumberRecordSubItem.description,
      };
      console.log('New SubItem Record:', newRecord);

      // Prepare the body for the API request
      const bodyRequest = {
        quantity: newRecord.quantity,
        amountPerUnit: newRecord.amountPerUnit,
      };

      // Make API call to calculate the total
      this._ApiService.post<any>(`/total`, bodyRequest).subscribe({
        next: (res) => {
          console.log('API Response - SubItem Total:', res);

          // Update `total` in the new record
          newRecord.total = res.total;

          // Remove the old record from `clonedSubItem`
          delete this.clonedSubItem[id];

          // Update MainItem subitems
          const { invoiceMainItemCode, total, totalWithProfit, amountPerUnitWithProfit, ...mainItemWithoutMainItemCode } = mainItem;

          const updatedSubItems = (mainItem?.subItems ?? []).map((subItem) =>
            subItem.invoiceSubItemCode === newRecord.invoiceSubItemCode
              ? { ...subItem, ...newRecord } // Replace the matching subitem
              : subItem
          );

          // Update the MainItem
          const updatedRecord: MainItem = {
            ...mainItemWithoutMainItemCode,
            subItems: updatedSubItems,

            invoiceMainItemCode: 0,
            total: 0,
            totalWithProfit: 0
          };

          console.log('Updated MainItem Record:', updatedRecord);

          // Remove empty or default properties from the updated record
          const filteredRecord = Object.fromEntries(
            Object.entries(updatedRecord).filter(([_, value]) => value !== '' && value !== 0 && value !== null && value !== undefined)
          );

          console.log('Filtered MainItem Record:', filteredRecord);

          // Update MainItem in `mainItemsRecords`
          const mainItemIndex = this.mainItemsRecords.findIndex((item) => item.invoiceMainItemCode === invoiceMainItemCode);
          if (mainItemIndex > -1) {
            this.mainItemsRecords[mainItemIndex] = {
              ...this.mainItemsRecords[mainItemIndex],
              ...filteredRecord,
            };

            // Recalculate total of all subitems
            const totalOfSubItems = this.mainItemsRecords[mainItemIndex].subItems.reduce(
              (sum, subItem) => sum + (subItem.total || 0),
              0
            );

            // Update `amountPerUnit`
            this.mainItemsRecords[mainItemIndex].amountPerUnit = totalOfSubItems;
            console.log(`Updated AmountPerUnit for MainItem (ID: ${mainItem.invoiceMainItemCode}):`, totalOfSubItems);

            const recalculateBodyRequest: any = {
              quantity: this.mainItemsRecords[mainItemIndex].quantity,
              amountPerUnit: totalOfSubItems,
            };

            // Conditionally add profitMargin if it has a non-zero value
            if (this.mainItemsRecords[mainItemIndex].profitMargin && this.mainItemsRecords[mainItemIndex].profitMargin !== 0) {
              recalculateBodyRequest.profitMargin = this.mainItemsRecords[mainItemIndex].profitMargin;
            }

            this._ApiService.post<any>(`/total`, recalculateBodyRequest).subscribe({
              next: (recalculateRes) => {
                console.log('Recalculated MainItem Totals:', recalculateRes);

                this.mainItemsRecords[mainItemIndex] = {
                  ...this.mainItemsRecords[mainItemIndex],
                  total: recalculateRes.total,
                  amountPerUnitWithProfit: recalculateRes.amountPerUnitWithProfit,
                  totalWithProfit: recalculateRes.totalWithProfit,
                };

                console.log(`Final Updated MainItem (ID: ${mainItem.invoiceMainItemCode}):`, this.mainItemsRecords[mainItemIndex]);

                // Update the global total value
                this.updateTotalValueAfterAction();
              },
              error: (err) => {
                console.error('Failed to recalculate totals:', err);
              },
            });
          }
        },
        error: (err) => {
          console.error('Failed to calculate SubItem total:', err);
        },
      });
    }
    if (this.updateSelectedServiceNumberRecordSubItem && this.updatedFormulaRecordSubItem && this.resultAfterTestUpdate) {
      console.log(record);
      console.log(this.updateSelectedServiceNumberRecordSubItem);
      const newRecord: SubItem = {
        ...clonedRecord,
        unitOfMeasurementCode: this.updateSelectedServiceNumberRecordSubItem.unitOfMeasurementCode,
        // this.updateSelectedServiceNumberRecordSubItem.baseUnitOfMeasurement,
        description: this.updateSelectedServiceNumberRecordSubItem.description,
        quantity: this.resultAfterTestUpdate,
      };
      console.log(newRecord);

      //....................
      const bodyRequest: any = {
        quantity: newRecord.quantity,
        amountPerUnit: newRecord.amountPerUnit
      };

      this._ApiService.post<any>(`/total`, bodyRequest).subscribe({
        next: (res) => {
          console.log('subitem with total:', res);
          newRecord.total = res.total;

          delete this.clonedSubItem[id];
          //....
          const { invoiceMainItemCode, total, totalWithProfit, amountPerUnitWithProfit, ...mainItemWithoutMainItemCode } = mainItem;

          const updatedSubItems = (mainItem?.subItems ?? []).map((subItem) =>
            subItem.invoiceSubItemCode === newRecord.invoiceSubItemCode
              ? { ...subItem, ...newRecord } // Replace the matching subitem
              : subItem
          );

          const updatedRecord: MainItem = {
            ...mainItemWithoutMainItemCode, // Copy all properties from the original record
            subItems: updatedSubItems,
            invoiceMainItemCode: 0,
            totalWithProfit: 0,
            total: 0,
            amountPerUnitWithProfit: 0,
          }
          console.log(updatedRecord);
          // Remove properties with empty or default values
          const filteredRecord = Object.fromEntries(
            Object.entries(updatedRecord).filter(([_, value]) => {
              return value !== '' && value !== 0 && value !== undefined && value !== null;
            })
          );
          console.log(filteredRecord);

          // Update mainItemsRecords array in the component to reflect the changes
          const mainItemIndex = this.mainItemsRecords.findIndex(item => item.invoiceMainItemCode === invoiceMainItemCode);
          if (mainItemIndex > -1) {
            // Update the specific MainItem in the array
            this.mainItemsRecords[mainItemIndex] = { ...this.mainItemsRecords[mainItemIndex], ...filteredRecord };

            ///....
            // Calculate the total of all subitems
            const totalOfSubItems = this.mainItemsRecords[mainItemIndex].subItems.reduce(
              (sum, subItem) => sum + (subItem.total || 0),
              0
            );

            // Update the main item's `amountPerUnit`
            this.mainItemsRecords[mainItemIndex].amountPerUnit = totalOfSubItems;

            console.log(
              `Updated MainItem (ID: ${mainItem.invoiceMainItemCode}) AmountPerUnit:`,
              this.mainItemsRecords[mainItemIndex].amountPerUnit
            );

            const recalculateBodyRequest: any = {
              quantity: this.mainItemsRecords[mainItemIndex].quantity,
              amountPerUnit: totalOfSubItems,
            };

            // Conditionally add profitMargin if it has a non-zero value
            if (this.mainItemsRecords[mainItemIndex].profitMargin && this.mainItemsRecords[mainItemIndex].profitMargin !== 0) {
              recalculateBodyRequest.profitMargin = this.mainItemsRecords[mainItemIndex].profitMargin;
            }

            this._ApiService.post<any>(`/total`, recalculateBodyRequest).subscribe({
              next: (recalculateRes) => {
                console.log('Updated main item totals:', recalculateRes);

                this.mainItemsRecords[mainItemIndex] = {
                  ...this.mainItemsRecords[mainItemIndex],
                  total: recalculateRes.total,
                  amountPerUnitWithProfit: recalculateRes.amountPerUnitWithProfit,
                  totalWithProfit: recalculateRes.totalWithProfit,
                };

                console.log(
                  `Recalculated MainItem (ID: ${mainItem.invoiceMainItemCode}):`,
                  this.mainItemsRecords[mainItemIndex]
                );

                // Update the global total value
                this.updateTotalValueAfterAction();
              },
              error: (err) => {
                console.error('Failed to recalculate totals:', err);
              },
            });
            ///....
          }
          // this.updateSelectedServiceNumberRecord=undefined;
          this.updatedFormulaRecordSubItem = undefined;
          this.resultAfterTestUpdate = undefined
          // Trigger change detection
          // this.cdr.detectChanges();
          console.log(this.mainItemsRecords);

        }, error: (err) => {
          console.log(err);
        },
        complete: () => {
        }
      });
      ///...................
    }

    if (this.updatedFormulaRecordSubItem && this.resultAfterTestUpdate) {
      const newRecord: SubItem = {
        ...clonedRecord,
        quantity: this.resultAfterTestUpdate,
      };
      console.log(newRecord);

      //....................
      const bodyRequest: any = {
        quantity: newRecord.quantity,
        amountPerUnit: newRecord.amountPerUnit
      };
      this._ApiService.post<any>(`/total`, bodyRequest).subscribe({
        next: (res) => {
          console.log('subitem with total:', res);
          newRecord.total = res.total;

          delete this.clonedSubItem[id];
          //...
          const { invoiceMainItemCode, total, totalWithProfit, amountPerUnitWithProfit, ...mainItemWithoutMainItemCode } = mainItem;

          const updatedSubItems = (mainItem?.subItems ?? []).map((subItem) =>
            subItem.invoiceSubItemCode === newRecord.invoiceSubItemCode
              ? { ...subItem, ...newRecord } // Replace the matching subitem
              : subItem
          );

          const updatedRecord: MainItem = {
            ...mainItemWithoutMainItemCode, // Copy all properties from the original record
            subItems: updatedSubItems,
            invoiceMainItemCode: 0,
            totalWithProfit: 0,
            total: 0,
            amountPerUnitWithProfit: 0,
          }
          console.log(updatedRecord);
          // Remove properties with empty or default values
          const filteredRecord = Object.fromEntries(
            Object.entries(updatedRecord).filter(([_, value]) => {
              return value !== '' && value !== 0 && value !== undefined && value !== null;
            })
          );
          console.log(filteredRecord);

          // Update mainItemsRecords array in the component to reflect the changes
          const mainItemIndex = this.mainItemsRecords.findIndex(item => item.invoiceMainItemCode === invoiceMainItemCode);
          if (mainItemIndex > -1) {
            // Update the specific MainItem in the array
            this.mainItemsRecords[mainItemIndex] = { ...this.mainItemsRecords[mainItemIndex], ...filteredRecord };

            ///....
            // Calculate the total of all subitems
            const totalOfSubItems = this.mainItemsRecords[mainItemIndex].subItems.reduce(
              (sum, subItem) => sum + (subItem.total || 0),
              0
            );

            // Update the main item's `amountPerUnit`
            this.mainItemsRecords[mainItemIndex].amountPerUnit = totalOfSubItems;

            console.log(
              `Updated MainItem (ID: ${mainItem.invoiceMainItemCode}) AmountPerUnit:`,
              this.mainItemsRecords[mainItemIndex].amountPerUnit
            );

            const recalculateBodyRequest: any = {
              quantity: this.mainItemsRecords[mainItemIndex].quantity,
              amountPerUnit: totalOfSubItems,
            };

            // Conditionally add profitMargin if it has a non-zero value
            if (this.mainItemsRecords[mainItemIndex].profitMargin && this.mainItemsRecords[mainItemIndex].profitMargin !== 0) {
              recalculateBodyRequest.profitMargin = this.mainItemsRecords[mainItemIndex].profitMargin;
            }

            this._ApiService.post<any>(`/total`, recalculateBodyRequest).subscribe({
              next: (recalculateRes) => {
                console.log('Updated main item totals:', recalculateRes);

                this.mainItemsRecords[mainItemIndex] = {
                  ...this.mainItemsRecords[mainItemIndex],
                  total: recalculateRes.total,
                  amountPerUnitWithProfit: recalculateRes.amountPerUnitWithProfit,
                  totalWithProfit: recalculateRes.totalWithProfit,
                };

                console.log(
                  `Recalculated MainItem (ID: ${mainItem.invoiceMainItemCode}):`,
                  this.mainItemsRecords[mainItemIndex]
                );
                // Update the global total value
                this.updateTotalValueAfterAction();
              },
              error: (err) => {
                console.error('Failed to recalculate totals:', err);
              },
            });
            ///....
          }
          // this.updateSelectedServiceNumberRecord=undefined;
          this.updatedFormulaRecordSubItem = undefined;
          this.resultAfterTestUpdate = undefined
          // Trigger change detection
          // this.cdr.detectChanges();
          console.log(this.mainItemsRecords);

        }, error: (err) => {
          console.log(err);
        },
        complete: () => {
        }
      });
      ///...................
    }

    if (!this.updateSelectedServiceNumberRecordSubItem && !this.updatedFormulaRecordSubItem && !this.resultAfterTestUpdate) {
      //....................
      const bodyRequest: any = {
        quantity: clonedRecord.quantity,
        amountPerUnit: clonedRecord.amountPerUnit,
      };
      this._ApiService.post<any>(`/total`, bodyRequest).subscribe({
        next: (res) => {
          console.log('subitem with total:', res);
          clonedRecord.total = res.total;

          delete this.clonedSubItem[id];
          // Reassign to force change detection
          // this.clonedSubItem = { ...this.clonedSubItem };

          const { invoiceMainItemCode, total, totalWithProfit, amountPerUnitWithProfit, ...mainItemWithoutMainItemCode } = mainItem;

          const updatedSubItems = (mainItem?.subItems ?? []).map((subItem) =>
            subItem.invoiceSubItemCode === clonedRecord.invoiceSubItemCode
              ? { ...subItem, ...clonedRecord } // Replace the matching subitem
              : subItem
          );

          // const updatedSubItems = (mainItem?.subItems ?? []).map(subItem =>
          //   // Modify only the specific sub-item that needs to be updated
          //   subItem.invoiceSubItemCode === invoiceSubItemCode
          //     ? this.removeProperties({ ...subItem, ...subItemWithoutSubItemCode }, ['invoiceMainItemCode', 'invoiceSubItemCode'])
          //     : this.removeProperties(subItem, ['invoiceMainItemCode', 'invoiceSubItemCode'])
          // );

          const updatedRecord: MainItem = {
            ...mainItemWithoutMainItemCode, // Copy all properties from the original record
            subItems: updatedSubItems,
            invoiceMainItemCode: 0,
            totalWithProfit: 0,
            total: 0,
            amountPerUnitWithProfit: 0,
          }
          console.log(updatedRecord);
          // Remove properties with empty or default values
          const filteredRecord = Object.fromEntries(
            Object.entries(updatedRecord).filter(([_, value]) => {
              return value !== '' && value !== 0 && value !== undefined && value !== null;
            })
          );
          console.log(filteredRecord);

          // Update mainItemsRecords array in the component to reflect the changes
          const mainItemIndex = this.mainItemsRecords.findIndex(item => item.invoiceMainItemCode === invoiceMainItemCode);
          if (mainItemIndex > -1) {
            // Update the specific MainItem in the array
            this.mainItemsRecords[mainItemIndex] = { ...this.mainItemsRecords[mainItemIndex], ...filteredRecord };

            ///....
            // Calculate the total of all subitems
            const totalOfSubItems = this.mainItemsRecords[mainItemIndex].subItems.reduce(
              (sum, subItem) => sum + (subItem.total || 0),
              0
            );

            // Update the main item's `amountPerUnit`
            this.mainItemsRecords[mainItemIndex].amountPerUnit = totalOfSubItems;

            console.log(
              `Updated MainItem (ID: ${mainItem.invoiceMainItemCode}) AmountPerUnit:`,
              this.mainItemsRecords[mainItemIndex].amountPerUnit
            );

            // Recalculate the main item's total, amountPerUnitWithProfit, and totalWithProfit
            const recalculateBodyRequest: any = {
              quantity: this.mainItemsRecords[mainItemIndex].quantity,
              amountPerUnit: totalOfSubItems,
            };

            // Conditionally add profitMargin if it has a non-zero value
            if (this.mainItemsRecords[mainItemIndex].profitMargin && this.mainItemsRecords[mainItemIndex].profitMargin !== 0) {
              recalculateBodyRequest.profitMargin = this.mainItemsRecords[mainItemIndex].profitMargin;
            }

            this._ApiService.post<any>(`/total`, recalculateBodyRequest).subscribe({
              next: (recalculateRes) => {
                console.log('Updated main item totals:', recalculateRes);

                this.mainItemsRecords[mainItemIndex] = {
                  ...this.mainItemsRecords[mainItemIndex],
                  total: recalculateRes.total,
                  amountPerUnitWithProfit: recalculateRes.amountPerUnitWithProfit,
                  totalWithProfit: recalculateRes.totalWithProfit,
                };

                console.log(
                  `Recalculated MainItem (ID: ${mainItem.invoiceMainItemCode}):`,
                  this.mainItemsRecords[mainItemIndex]
                );

                // Update the global total value
                this.updateTotalValueAfterAction();

                //delete this.clonedSubItem[id];
                // Reassign to force change detection
                // this.clonedSubItem = { ...this.clonedSubItem };
                //  delete this.clonedSubItem[record.invoiceSubItemCode?record.invoiceSubItemCode:0];
              },
              error: (err) => {
                console.error('Failed to recalculate totals:', err);
              },
            });
            ///....
          }
          // Trigger change detection
          // this.cdr.detectChanges();
          console.log(this.mainItemsRecords);

        }, error: (err) => {
          console.log(err);
        },
        complete: () => {
        }
      });
      ///...................
    }
  }
  //end new...  


  //old...
  // onSubItemEditSave(index: number, record: SubItem, mainItem: MainItem) {
  //   console.log(mainItem);
  //   console.log(record);
  //   console.log(index);
  //   let id = record.invoiceSubItemCode;
  //   console.log(id);

  //   const clonedRecord = { ...record };
  //   const { invoiceSubItemCode, ...subItemWithoutSubItemCode } = clonedRecord;


  //  // const { invoiceSubItemCode, ...subItemWithoutSubItemCode } = record;
  //   console.log(this.updateSelectedServiceNumberSubItem);

  //   if (this.updateSelectedServiceNumberRecordSubItem) {
  //     const newRecord: SubItem = {
  //       ...record,
  //       unitOfMeasurementCode: this.updateSelectedServiceNumberRecordSubItem.unitOfMeasurementCode,
  //       //this.updateSelectedServiceNumberRecordSubItem.baseUnitOfMeasurement,
  //       description: this.updateSelectedServiceNumberRecordSubItem.description,
  //     };
  //     console.log(newRecord);
  //     //..............
  //     const bodyRequest: any = {
  //       quantity: newRecord.quantity,
  //       amountPerUnit: newRecord.amountPerUnit
  //     };
  //     this._ApiService.post<any>(`/total`, bodyRequest).subscribe({
  //       next: (res) => {
  //         console.log('subitem with total:', res);
  //         newRecord.total = res.total;
  //         delete this.clonedSubItem[id];
  //         const { invoiceMainItemCode, total, totalWithProfit, amountPerUnitWithProfit, ...mainItemWithoutMainItemCode } = mainItem;
  //         const updatedSubItems = (mainItem?.subItems ?? []).map(subItem =>
  //           subItem.invoiceSubItemCode === newRecord.invoiceSubItemCode
  //             ? this.removeProperties({ ...subItem, ...newRecord }, ['invoiceMainItemCode', 'invoiceSubItemCode'])
  //             : this.removeProperties(subItem, ['invoiceMainItemCode', 'invoiceSubItemCode'])
  //         );
  //         const updatedRecord: MainItem = {
  //           ...mainItemWithoutMainItemCode, // Copy all properties from the original record
  //           subItems: updatedSubItems,
  //           invoiceMainItemCode: 0,
  //           totalWithProfit: 0,
  //           total: 0,
  //           amountPerUnitWithProfit: 0,
  //         }
  //         console.log(updatedRecord);
  //         // Remove properties with empty or default values
  //         const filteredRecord = Object.fromEntries(
  //           Object.entries(updatedRecord).filter(([_, value]) => {
  //             return value !== '' && value !== 0 && value !== undefined && value !== null;
  //           })
  //         );
  //         console.log(filteredRecord);
  //         const mainItemIndex = this.mainItemsRecords.findIndex(item => item.invoiceMainItemCode === invoiceMainItemCode);
  //         if (mainItemIndex > -1) {
  //           this.mainItemsRecords[mainItemIndex] = { ...this.mainItemsRecords[mainItemIndex], ...filteredRecord };
  //           // Calculate the total of all subitems
  //           const totalOfSubItems = this.mainItemsRecords[mainItemIndex].subItems.reduce(
  //             (sum, subItem) => sum + (subItem.total || 0),
  //             0
  //           );
  //           // Update the main item's `amountPerUnit`
  //           this.mainItemsRecords[mainItemIndex].amountPerUnit = totalOfSubItems;
  //           console.log(
  //             `Updated MainItem (ID: ${mainItem.invoiceMainItemCode}) AmountPerUnit:`,
  //             this.mainItemsRecords[mainItemIndex].amountPerUnit
  //           );
  //           // Recalculate the main item's total, amountPerUnitWithProfit, and totalWithProfit
  //           const recalculateBodyRequest = {
  //             quantity: this.mainItemsRecords[mainItemIndex].quantity,
  //             amountPerUnit: totalOfSubItems,
  //           };
  //           this._ApiService.post<any>(`/total`, recalculateBodyRequest).subscribe({
  //             next: (recalculateRes) => {
  //               console.log('Updated main item totals:', recalculateRes);

  //               this.mainItemsRecords[mainItemIndex] = {
  //                 ...this.mainItemsRecords[mainItemIndex],
  //                 total: recalculateRes.total,
  //                 amountPerUnitWithProfit: recalculateRes.amountPerUnitWithProfit,
  //                 totalWithProfit: recalculateRes.totalWithProfit,
  //               };

  //               console.log(
  //                 `Recalculated MainItem (ID: ${mainItem.invoiceMainItemCode}):`,
  //                 this.mainItemsRecords[mainItemIndex]
  //               );

  //               // Update the global total value
  //               this.updateTotalValueAfterAction();

  //               delete this.clonedSubItem[id];
  //               // delete this.clonedSubItem[record.invoiceSubItemCode ? record.invoiceSubItemCode : 0];
  //             },
  //             error: (err) => {
  //               console.error('Failed to recalculate totals:', err);
  //             },
  //           });
  //           ///....
  //         }
  //         // this.cdr.detectChanges();
  //         console.log(this.mainItemsRecords);
  //       }, error: (err) => {
  //         console.log(err);
  //       },
  //       complete: () => {
  //       }
  //     });
  //     //..............     
  //   }
  //   if (this.updateSelectedServiceNumberRecordSubItem && this.updatedFormulaRecordSubItem && this.resultAfterTestUpdate) {
  //     console.log(record);
  //     console.log(this.updateSelectedServiceNumberRecordSubItem);
  //     const newRecord: SubItem = {
  //       ...record,
  //       unitOfMeasurementCode: this.updateSelectedServiceNumberRecordSubItem.unitOfMeasurementCode,
  //       // this.updateSelectedServiceNumberRecordSubItem.baseUnitOfMeasurement,
  //       description: this.updateSelectedServiceNumberRecordSubItem.description,
  //       quantity: this.resultAfterTestUpdate,
  //     };
  //     console.log(newRecord);

  //     //....................
  //     const bodyRequest: any = {
  //       quantity: newRecord.quantity,
  //       amountPerUnit: newRecord.amountPerUnit
  //     };

  //     this._ApiService.post<any>(`/total`, bodyRequest).subscribe({
  //       next: (res) => {
  //         console.log('subitem with total:', res);
  //         newRecord.total = res.total;

  //         delete this.clonedSubItem[id];
  //         //....
  //         const { invoiceMainItemCode, total, totalWithProfit, amountPerUnitWithProfit, ...mainItemWithoutMainItemCode } = mainItem;

  //         const updatedSubItems = (mainItem?.subItems ?? []).map(subItem =>
  //           // Modify only the specific sub-item that needs to be updated
  //           subItem.invoiceSubItemCode === newRecord.invoiceSubItemCode
  //             ? this.removeProperties({ ...subItem, ...newRecord }, ['invoiceMainItemCode', 'invoiceSubItemCode'])
  //             : this.removeProperties(subItem, ['invoiceMainItemCode', 'invoiceSubItemCode'])
  //         );

  //         const updatedRecord: MainItem = {
  //           ...mainItemWithoutMainItemCode, // Copy all properties from the original record
  //           subItems: updatedSubItems,
  //           invoiceMainItemCode: 0,
  //           totalWithProfit: 0,
  //           total: 0,
  //           amountPerUnitWithProfit: 0,
  //         }
  //         console.log(updatedRecord);
  //         // Remove properties with empty or default values
  //         const filteredRecord = Object.fromEntries(
  //           Object.entries(updatedRecord).filter(([_, value]) => {
  //             return value !== '' && value !== 0 && value !== undefined && value !== null;
  //           })
  //         );
  //         console.log(filteredRecord);

  //         // Update mainItemsRecords array in the component to reflect the changes
  //         const mainItemIndex = this.mainItemsRecords.findIndex(item => item.invoiceMainItemCode === invoiceMainItemCode);
  //         if (mainItemIndex > -1) {
  //           // Update the specific MainItem in the array
  //           this.mainItemsRecords[mainItemIndex] = { ...this.mainItemsRecords[mainItemIndex], ...filteredRecord };

  //           ///....
  //           // Calculate the total of all subitems
  //           const totalOfSubItems = this.mainItemsRecords[mainItemIndex].subItems.reduce(
  //             (sum, subItem) => sum + (subItem.total || 0),
  //             0
  //           );

  //           // Update the main item's `amountPerUnit`
  //           this.mainItemsRecords[mainItemIndex].amountPerUnit = totalOfSubItems;

  //           console.log(
  //             `Updated MainItem (ID: ${mainItem.invoiceMainItemCode}) AmountPerUnit:`,
  //             this.mainItemsRecords[mainItemIndex].amountPerUnit
  //           );

  //           // Recalculate the main item's total, amountPerUnitWithProfit, and totalWithProfit
  //           const recalculateBodyRequest = {
  //             quantity: this.mainItemsRecords[mainItemIndex].quantity,
  //             amountPerUnit: totalOfSubItems,
  //           };

  //           this._ApiService.post<any>(`/total`, recalculateBodyRequest).subscribe({
  //             next: (recalculateRes) => {
  //               console.log('Updated main item totals:', recalculateRes);

  //               this.mainItemsRecords[mainItemIndex] = {
  //                 ...this.mainItemsRecords[mainItemIndex],
  //                 total: recalculateRes.total,
  //                 amountPerUnitWithProfit: recalculateRes.amountPerUnitWithProfit,
  //                 totalWithProfit: recalculateRes.totalWithProfit,
  //               };

  //               console.log(
  //                 `Recalculated MainItem (ID: ${mainItem.invoiceMainItemCode}):`,
  //                 this.mainItemsRecords[mainItemIndex]
  //               );

  //               // Update the global total value
  //               this.updateTotalValueAfterAction();

  //               delete this.clonedSubItem[id];

  //               // delete this.clonedSubItem[record.invoiceSubItemCode ? record.invoiceSubItemCode : 0];
  //             },
  //             error: (err) => {
  //               console.error('Failed to recalculate totals:', err);
  //             },
  //           });
  //           ///....
  //         }
  //         // this.updateSelectedServiceNumberRecord=undefined;
  //         this.updatedFormulaRecordSubItem = undefined;
  //         this.resultAfterTestUpdate = undefined
  //         // Trigger change detection
  //         // this.cdr.detectChanges();
  //         console.log(this.mainItemsRecords);

  //       }, error: (err) => {
  //         console.log(err);
  //       },
  //       complete: () => {
  //       }
  //     });
  //     ///...................
  //   }
  //   if (this.updatedFormulaRecordSubItem && this.resultAfterTestUpdate) {
  //     const newRecord: SubItem = {
  //       ...record,
  //       quantity: this.resultAfterTestUpdate,
  //     };
  //     console.log(newRecord);

  //     //....................
  //     const bodyRequest: any = {
  //       quantity: newRecord.quantity,
  //       amountPerUnit: newRecord.amountPerUnit
  //     };
  //     this._ApiService.post<any>(`/total`, bodyRequest).subscribe({
  //       next: (res) => {
  //         console.log('subitem with total:', res);
  //         newRecord.total = res.total;

  //         delete this.clonedSubItem[id];
  //         //...
  //         const { invoiceMainItemCode, total, totalWithProfit, amountPerUnitWithProfit, ...mainItemWithoutMainItemCode } = mainItem;

  //         const updatedSubItems = (mainItem?.subItems ?? []).map(subItem =>
  //           // Modify only the specific sub-item that needs to be updated
  //           subItem.invoiceSubItemCode === newRecord.invoiceSubItemCode
  //             ? this.removeProperties({ ...subItem, ...newRecord }, ['invoiceMainItemCode', 'invoiceSubItemCode'])
  //             : this.removeProperties(subItem, ['invoiceMainItemCode', 'invoiceSubItemCode'])
  //         );

  //         const updatedRecord: MainItem = {
  //           ...mainItemWithoutMainItemCode, // Copy all properties from the original record
  //           subItems: updatedSubItems,
  //           invoiceMainItemCode: 0,
  //           totalWithProfit: 0,
  //           total: 0,
  //           amountPerUnitWithProfit: 0,
  //         }
  //         console.log(updatedRecord);
  //         // Remove properties with empty or default values
  //         const filteredRecord = Object.fromEntries(
  //           Object.entries(updatedRecord).filter(([_, value]) => {
  //             return value !== '' && value !== 0 && value !== undefined && value !== null;
  //           })
  //         );
  //         console.log(filteredRecord);

  //         // Update mainItemsRecords array in the component to reflect the changes
  //         const mainItemIndex = this.mainItemsRecords.findIndex(item => item.invoiceMainItemCode === invoiceMainItemCode);
  //         if (mainItemIndex > -1) {
  //           // Update the specific MainItem in the array
  //           this.mainItemsRecords[mainItemIndex] = { ...this.mainItemsRecords[mainItemIndex], ...filteredRecord };

  //           ///....
  //           // Calculate the total of all subitems
  //           const totalOfSubItems = this.mainItemsRecords[mainItemIndex].subItems.reduce(
  //             (sum, subItem) => sum + (subItem.total || 0),
  //             0
  //           );

  //           // Update the main item's `amountPerUnit`
  //           this.mainItemsRecords[mainItemIndex].amountPerUnit = totalOfSubItems;

  //           console.log(
  //             `Updated MainItem (ID: ${mainItem.invoiceMainItemCode}) AmountPerUnit:`,
  //             this.mainItemsRecords[mainItemIndex].amountPerUnit
  //           );

  //           // Recalculate the main item's total, amountPerUnitWithProfit, and totalWithProfit
  //           const recalculateBodyRequest = {
  //             quantity: this.mainItemsRecords[mainItemIndex].quantity,
  //             amountPerUnit: totalOfSubItems,
  //           };

  //           this._ApiService.post<any>(`/total`, recalculateBodyRequest).subscribe({
  //             next: (recalculateRes) => {
  //               console.log('Updated main item totals:', recalculateRes);

  //               this.mainItemsRecords[mainItemIndex] = {
  //                 ...this.mainItemsRecords[mainItemIndex],
  //                 total: recalculateRes.total,
  //                 amountPerUnitWithProfit: recalculateRes.amountPerUnitWithProfit,
  //                 totalWithProfit: recalculateRes.totalWithProfit,
  //               };

  //               console.log(
  //                 `Recalculated MainItem (ID: ${mainItem.invoiceMainItemCode}):`,
  //                 this.mainItemsRecords[mainItemIndex]
  //               );

  //               // Update the global total value
  //               this.updateTotalValueAfterAction();

  //               delete this.clonedSubItem[id];
  //               //delete this.clonedSubItem[record.invoiceSubItemCode ? record.invoiceSubItemCode : 0];
  //             },
  //             error: (err) => {
  //               console.error('Failed to recalculate totals:', err);
  //             },
  //           });
  //           ///....
  //         }
  //         // this.updateSelectedServiceNumberRecord=undefined;
  //         this.updatedFormulaRecordSubItem = undefined;
  //         this.resultAfterTestUpdate = undefined
  //         // Trigger change detection
  //         // this.cdr.detectChanges();
  //         console.log(this.mainItemsRecords);

  //       }, error: (err) => {
  //         console.log(err);
  //       },
  //       complete: () => {
  //       }
  //     });
  //     ///...................
  //   }
  //   if (!this.updateSelectedServiceNumberRecordSubItem && !this.updatedFormulaRecordSubItem && !this.resultAfterTestUpdate) {

  //     //....................
  //     const bodyRequest: any = {
  //       quantity: subItemWithoutSubItemCode.quantity,
  //       amountPerUnit: subItemWithoutSubItemCode.amountPerUnit
  //     };


  //     this._ApiService.post<any>(`/total`, bodyRequest).subscribe({
  //       next: (res) => {
  //         console.log('subitem with total:', res);
  //         subItemWithoutSubItemCode.total = res.total;

  //         delete this.clonedSubItem[id];
  //         // Reassign to force change detection
  //         this.clonedSubItem = { ...this.clonedSubItem };

  //         const { invoiceMainItemCode, total, totalWithProfit, amountPerUnitWithProfit, ...mainItemWithoutMainItemCode } = mainItem;

  //         const updatedSubItems = (mainItem?.subItems ?? []).map(subItem =>
  //           // Modify only the specific sub-item that needs to be updated
  //           subItem.invoiceSubItemCode === invoiceSubItemCode
  //             ? this.removeProperties({ ...subItem, ...subItemWithoutSubItemCode }, ['invoiceMainItemCode', 'invoiceSubItemCode'])
  //             : this.removeProperties(subItem, ['invoiceMainItemCode', 'invoiceSubItemCode'])
  //         );

  //         const updatedRecord: MainItem = {
  //           ...mainItemWithoutMainItemCode, // Copy all properties from the original record
  //           subItems: updatedSubItems,
  //           invoiceMainItemCode: 0,
  //           totalWithProfit: 0,
  //           total: 0,
  //           amountPerUnitWithProfit: 0,
  //         }
  //         console.log(updatedRecord);
  //         // Remove properties with empty or default values
  //         const filteredRecord = Object.fromEntries(
  //           Object.entries(updatedRecord).filter(([_, value]) => {
  //             return value !== '' && value !== 0 && value !== undefined && value !== null;
  //           })
  //         );
  //         console.log(filteredRecord);

  //         // Update mainItemsRecords array in the component to reflect the changes
  //         const mainItemIndex = this.mainItemsRecords.findIndex(item => item.invoiceMainItemCode === invoiceMainItemCode);
  //         if (mainItemIndex > -1) {
  //           // Update the specific MainItem in the array
  //           this.mainItemsRecords[mainItemIndex] = { ...this.mainItemsRecords[mainItemIndex], ...filteredRecord };

  //           ///....
  //           // Calculate the total of all subitems
  //           const totalOfSubItems = this.mainItemsRecords[mainItemIndex].subItems.reduce(
  //             (sum, subItem) => sum + (subItem.total || 0),
  //             0
  //           );

  //           // Update the main item's `amountPerUnit`
  //           this.mainItemsRecords[mainItemIndex].amountPerUnit = totalOfSubItems;

  //           console.log(
  //             `Updated MainItem (ID: ${mainItem.invoiceMainItemCode}) AmountPerUnit:`,
  //             this.mainItemsRecords[mainItemIndex].amountPerUnit
  //           );

  //           // Recalculate the main item's total, amountPerUnitWithProfit, and totalWithProfit
  //           const recalculateBodyRequest = {
  //             quantity: this.mainItemsRecords[mainItemIndex].quantity,
  //             amountPerUnit: totalOfSubItems,
  //           };

  //           this._ApiService.post<any>(`/total`, recalculateBodyRequest).subscribe({
  //             next: (recalculateRes) => {
  //               console.log('Updated main item totals:', recalculateRes);

  //               this.mainItemsRecords[mainItemIndex] = {
  //                 ...this.mainItemsRecords[mainItemIndex],
  //                 total: recalculateRes.total,
  //                 amountPerUnitWithProfit: recalculateRes.amountPerUnitWithProfit,
  //                 totalWithProfit: recalculateRes.totalWithProfit,
  //               };

  //               console.log(
  //                 `Recalculated MainItem (ID: ${mainItem.invoiceMainItemCode}):`,
  //                 this.mainItemsRecords[mainItemIndex]
  //               );

  //               // Update the global total value
  //               this.updateTotalValueAfterAction();

  //               delete this.clonedSubItem[id];
  //               // Reassign to force change detection
  //               this.clonedSubItem = { ...this.clonedSubItem };
  //               //  delete this.clonedSubItem[record.invoiceSubItemCode?record.invoiceSubItemCode:0];
  //             },
  //             error: (err) => {
  //               console.error('Failed to recalculate totals:', err);
  //             },
  //           });
  //           ///....
  //         }
  //         // Trigger change detection
  //         // this.cdr.detectChanges();
  //         console.log(this.mainItemsRecords);

  //       }, error: (err) => {
  //         console.log(err);
  //       },
  //       complete: () => {
  //       }
  //     });
  //     ///...................

  //   }
  // }

  onSubItemEditCancel(subItem: any, index: number) {
    const originalItem = this.clonedSubItem[subItem.invoiceSubItemCode];
    if (originalItem) {
      this.mainItemsRecords.forEach(mainItem => {
        if (mainItem.subItems && mainItem.subItems[index] === subItem) {
          mainItem.subItems[index] = { ...originalItem };
        }
      });
      delete this.clonedSubItem[subItem.invoiceSubItemCode];
      // Reassign to force change detection
      // this.clonedSubItem = { ...this.clonedSubItem };
    }
  }
  // Delete MainItem || SubItem

  //new....
  deleteRecord() {
    console.log("delete");

    if (this.selectedMainItems.length) {
      console.log('Selected MainItems:', this.selectedMainItems);
      this.confirmationService.confirm({
        message: 'Are you sure you want to delete the selected MainItems?',
        header: 'Confirm',
        icon: 'pi pi-exclamation-triangle',
        accept: () => {


          // Log before filter operation
          console.log('MainItems before deletion:', this.mainItemsRecords);

          console.log('Selected MainItems:', this.selectedMainItems);

          // // Perform the deletion
          this.mainItemsRecords = this.mainItemsRecords.filter(item => {
            const isSelected = this.selectedMainItems.some(selected => selected.invoiceMainItemCode === item.invoiceMainItemCode);
            console.log(`Item ${item.invoiceMainItemCode} is selected: ${isSelected}`);
            return !isSelected;
          });

          this.mainItemsRecords = [...this.mainItemsRecords]; 

          // for (const record of this.selectedMainItems) {
          //   console.log(record);

          //   //
          //   this.mainItemsRecords = this.mainItemsRecords.filter(item =>
          //     !this.selectedMainItems.some(selected => selected.invoiceMainItemCode === item.invoiceMainItemCode)
          //   );

          //   //
          //   //  this.mainItemsRecords = this.mainItemsRecords.filter(item => item.invoiceMainItemCode !== record.invoiceMainItemCode);
          //   // this.cdr.detectChanges();
          //   console.log(this.mainItemsRecords);
          // }



          console.log('MainItems after deletion:', this.mainItemsRecords);
          // console.log('Confirmed MainItem deletion');
          // this.mainItemsRecords = this.mainItemsRecords.filter(item =>
          //   !this.selectedMainItems.some(selected => selected.invoiceMainItemCode === item.invoiceMainItemCode)
          // );
          // console.log('MainItems after deletion:', this.mainItemsRecords);
          this.updateTotalValueAfterAction();
          this.selectedMainItems = [];
          this.cdr.detectChanges();
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'MainItems deleted.', life: 3000 });
        }
      });
    }

    if (this.selectedSubItems.length) {
      this.confirmationService.confirm({
        message: 'Are you sure you want to delete the selected record?',
        header: 'Confirm',
        icon: 'pi pi-exclamation-triangle',
        accept: () => {
          ///..... old

          for (const record of this.selectedSubItems) {
            console.log(record);
            if (record.invoiceSubItemCode) {

              for (const mainItem of this.mainItemsRecords) {

                ///..................
                // Find the MainItem that contains the SubItem
                const subItemIndex = mainItem.subItems.findIndex(subItem => subItem.invoiceSubItemCode === record.invoiceSubItemCode);
                if (subItemIndex > -1) {
                  // Remove the SubItem from the MainItem's subItems array
                  mainItem.subItems.splice(subItemIndex, 1);
                  //....
                  // Recalculate the total of all subitems
                  const totalOfSubItems = mainItem.subItems.reduce(
                    (sum, subItem) => sum + (subItem.total || 0),
                    0
                  );

                  // Update the main item's amountPerUnit
                  mainItem.amountPerUnit = totalOfSubItems;

                  // Prepare the recalculation request for the main item's totals
                  const recalculateBodyRequest = {
                    quantity: mainItem.quantity,
                    amountPerUnit: totalOfSubItems,
                  };

                  // Call the API to recalculate the main item's totals
                  this._ApiService.post<any>(`/total`, recalculateBodyRequest).subscribe({
                    next: (recalculateRes) => {
                      console.log('Updated main item totals after deletion:', recalculateRes);

                      mainItem.total = recalculateRes.total;
                      mainItem.amountPerUnitWithProfit = recalculateRes.amountPerUnitWithProfit;
                      mainItem.totalWithProfit = recalculateRes.totalWithProfit;

                      // Recalculate the global total value
                      this.updateTotalValueAfterAction();
                    },
                    error: (err) => {
                      console.error('Failed to recalculate totals:', err);
                    },
                  });
                  //....
                }
              }
              // this.cdr.detectChanges();
              console.log(this.mainItemsRecords);
            }

          }
          this.messageService.add({ severity: 'success', summary: 'Successfully', detail: 'Deleted', life: 3000 });
          this.selectedSubItems = []; // Clear the selectedRecords array after deleting all records
        }
      });
    }
  }

  //end new delete....

  // deleteRecord() {
  //   console.log("delete");
  //   if (this.selectedMainItems.length) {
  //     this.confirmationService.confirm({
  //       message: 'Are you sure you want to delete the selected record?',
  //       header: 'Confirm',
  //       icon: 'pi pi-exclamation-triangle',
  //       accept: () => {

  //          // Filter out selected MainItems from the records
  //       this.mainItemsRecords = this.mainItemsRecords.filter(item =>
  //         !this.selectedMainItems.some(selected => selected.invoiceMainItemCode === item.invoiceMainItemCode)
  //       );

  //       console.log(this.mainItemsRecords);
  //       this.updateTotalValueAfterAction();
  //       this.selectedMainItems = [];
  //         // for (const record of this.selectedMainItems) {
  //         //   console.log(record);

  //         //   //
  //         //   this.mainItemsRecords = this.mainItemsRecords.filter(item => 
  //         //     !this.selectedMainItems.some(selected => selected.invoiceMainItemCode === item.invoiceMainItemCode)
  //         //   );

  //         //   //
  //         // //  this.mainItemsRecords = this.mainItemsRecords.filter(item => item.invoiceMainItemCode !== record.invoiceMainItemCode);
  //         //   // this.cdr.detectChanges();
  //         //   console.log(this.mainItemsRecords);
  //         //   this.updateTotalValueAfterAction();

  //         //   // this._ApiService.delete<MainItem>('mainitems', record.invoiceMainItemCode).subscribe({
  //         //   //   next: (res) => {
  //         //   //     console.log('mainitem deleted :', res);
  //         //   //     this.totalValue = 0;
  //         //   //     this.ngOnInit()
  //         //   //   }, error: (err) => {
  //         //   //     console.log(err);
  //         //   //   },
  //         //   //   complete: () => {
  //         //   //     this.messageService.add({ severity: 'success', summary: 'Successfully', detail: 'Deleted', life: 3000 });
  //         //   //     this.selectedMainItems = []
  //         //   //   }
  //         //   // })
  //         // }
  //       }
  //     });
  //   }
  //   if (this.selectedSubItems.length) {
  //     this.confirmationService.confirm({
  //       message: 'Are you sure you want to delete the selected record?',
  //       header: 'Confirm',
  //       icon: 'pi pi-exclamation-triangle',
  //       accept: () => {


  //         ///new............
  //         for (const record of this.selectedSubItems) {
  //           for (const mainItem of this.mainItemsRecords) {
  //             // Find and remove the subitem
  //             const subItemIndex = mainItem.subItems.findIndex(subItem => subItem.invoiceSubItemCode === record.invoiceSubItemCode);
  //             if (subItemIndex > -1) {
  //               mainItem.subItems.splice(subItemIndex, 1);
  //             }
  //           }
  //         }

  //         // Recalculate totals for affected MainItems
  //         for (const mainItem of this.mainItemsRecords) {
  //           const totalOfSubItems = mainItem.subItems.reduce(
  //             (sum, subItem) => sum + (subItem.total || 0),
  //             0
  //           );
  //           mainItem.amountPerUnit = totalOfSubItems;

  //           const recalculateBodyRequest = {
  //             quantity: mainItem.quantity,
  //             amountPerUnit: totalOfSubItems,
  //           };

  //           this._ApiService.post<any>(`/total`, recalculateBodyRequest).subscribe({
  //             next: (recalculateRes) => {
  //               console.log('Updated MainItem totals after deletion:', recalculateRes);

  //               mainItem.total = recalculateRes.total;
  //               mainItem.amountPerUnitWithProfit = recalculateRes.amountPerUnitWithProfit;
  //               mainItem.totalWithProfit = recalculateRes.totalWithProfit;

  //               this.updateTotalValueAfterAction();
  //             },
  //             error: (err) => {
  //               console.error('Failed to recalculate totals:', err);
  //             },
  //           });
  //         }

  //         console.log(this.mainItemsRecords);


  //         ///end new.............
  //         ///..... old

  //         // for (const record of this.selectedSubItems) {
  //         //   console.log(record);
  //         //   if (record.invoiceSubItemCode) {

  //         //     for (const mainItem of this.mainItemsRecords) {

  //         //       ///..................
  //         //       // Find the MainItem that contains the SubItem
  //         //       const subItemIndex = mainItem.subItems.findIndex(subItem => subItem.invoiceSubItemCode === record.invoiceSubItemCode);
  //         //       if (subItemIndex > -1) {
  //         //         // Remove the SubItem from the MainItem's subItems array
  //         //         mainItem.subItems.splice(subItemIndex, 1);
  //         //         //....
  //         //         // Recalculate the total of all subitems
  //         //         const totalOfSubItems = mainItem.subItems.reduce(
  //         //           (sum, subItem) => sum + (subItem.total || 0),
  //         //           0
  //         //         );

  //         //         // Update the main item's amountPerUnit
  //         //         mainItem.amountPerUnit = totalOfSubItems;

  //         //         // Prepare the recalculation request for the main item's totals
  //         //         const recalculateBodyRequest = {
  //         //           quantity: mainItem.quantity,
  //         //           amountPerUnit: totalOfSubItems,
  //         //         };

  //         //         // Call the API to recalculate the main item's totals
  //         //         this._ApiService.post<any>(`/total`, recalculateBodyRequest).subscribe({
  //         //           next: (recalculateRes) => {
  //         //             console.log('Updated main item totals after deletion:', recalculateRes);

  //         //             mainItem.total = recalculateRes.total;
  //         //             mainItem.amountPerUnitWithProfit = recalculateRes.amountPerUnitWithProfit;
  //         //             mainItem.totalWithProfit = recalculateRes.totalWithProfit;

  //         //             // Recalculate the global total value
  //         //             this.updateTotalValueAfterAction();
  //         //           },
  //         //           error: (err) => {
  //         //             console.error('Failed to recalculate totals:', err);
  //         //           },
  //         //         });
  //         //         //....
  //         //       }
  //         //     }
  //         //     // this.cdr.detectChanges();
  //         //     console.log(this.mainItemsRecords);
  //         //   }

  //         // }
  //         this.messageService.add({ severity: 'success', summary: 'Successfully', detail: 'Deleted', life: 3000 });
  //         this.selectedSubItems = []; // Clear the selectedRecords array after deleting all records
  //       }
  //     });
  //   }
  // }

  // Helper Functions:
  removePropertiesFrom(obj: any, propertiesToRemove: string[]): any {
    const newObj: any = {};
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (Array.isArray(obj[key])) {
          // If the property is an array, recursively remove properties from each element
          newObj[key] = obj[key].map((item: any) => this.removeProperties(item, propertiesToRemove));
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          // If the property is an object, recursively remove properties from the object
          newObj[key] = this.removeProperties(obj[key], propertiesToRemove);
        } else if (!propertiesToRemove.includes(key)) {
          // Otherwise, copy the property if it's not in the list to remove
          newObj[key] = obj[key];
        }
      }
    }
    return newObj;
  }
  removeProperties(obj: any, propertiesToRemove: string[]): any {
    const newObj: any = {};
    Object.keys(obj).forEach(key => {
      if (!propertiesToRemove.includes(key)) {
        newObj[key] = obj[key];
      }
    });
    return newObj;
  }
  resetNewMainItem() {
    this.newMainItem = {
      Type: '',
      invoiceMainItemCode: 0,
      serviceNumberCode: 0,
      description: "",
      quantity: 0,
      unitOfMeasurementCode: "",
      formulaCode: "",
      amountPerUnit: 0,
      currencyCode: "",
      total: 0,
      profitMargin: 0,
      totalWithProfit: 0,
      subItems: [],
      isPersisted: false,
    },
      this.selectedUnitOfMeasure = "";
    this.selectedFormula = "";
    this.selectedCurrency = "";
    this.selectedServiceNumber = 0;
  }
  resetNewSubItem() {
    this.newSubItem = {
      Type: '',
      invoiceSubItemCode: 0,
      // invoiceMainItemCode: 0,
      serviceNumberCode: 0,
      description: "",
      quantity: 0,
      unitOfMeasurementCode: "",
      formulaCode: "",
      amountPerUnit: 0,
      currencyCode: "",
      total: 0
    },
      this.selectedUnitOfMeasureSubItem = "";
    this.selectedFormulaSubItem = "";
    this.selectedCurrencySubItem = "";
    this.selectedServiceNumberSubItem = 0;
  }
  // // to handel checkbox selection:
  // selectedMainItems: MainItem[] = [];
  // selectedSubItems: SubItem[] = [];
  // onMainItemSelection(event: any, mainItem: MainItem) {
  //   mainItem.selected = event.checked;
  //   this.selectedMainItems = event.checked
  //   if (mainItem.selected) {
  //     if (mainItem.subItems && mainItem.subItems.length > 0) {
  //       mainItem.subItems.forEach(subItem => subItem.selected = !subItem.selected);
  //     }
  //   }
  //   else {
  //     // User deselected the record, so we need to deselect all associated subitems
  //     if (mainItem.subItems && mainItem.subItems.length > 0) {
  //       mainItem.subItems.forEach(subItem => subItem.selected = false)
  //       console.log(mainItem.subItems);
  //     }
  //   }
  //   // For Profit Margin:
  //   if (event.checked) {
  //     this.selectedRowsForProfit.push(mainItem);
  //     console.log(this.selectedRowsForProfit);
  //   } else {
  //     const index = this.selectedRowsForProfit.indexOf(mainItem);
  //     if (index !== -1) {
  //       this.selectedRowsForProfit.splice(index, 1);
  //       console.log(this.selectedRowsForProfit);
  //     }
  //   }
  // }
  //new selection.....

  selectedMainItems: MainItem[] = [];
  selectedSubItems: SubItem[] = [];

  onMainItemSelection(event: any, mainItem: MainItem) {
    // Toggle MainItem selection
    mainItem.selected = event.checked;

    // Update selectedMainItems array
    if (mainItem.selected) {
      this.selectedMainItems.push(mainItem);
      this.selectedRowsForProfit.push(mainItem); // Add to profit rows
    } else {
      this.selectedMainItems = this.selectedMainItems.filter(item => item !== mainItem);
      this.selectedRowsForProfit = this.selectedRowsForProfit.filter(item => item !== mainItem); // Remove from profit rows
    }

    // Handle SubItems if MainItem has any
    // if (mainItem.subItems && mainItem.subItems.length > 0) {
    //   mainItem.subItems.forEach(subItem => {
    //     subItem.selected = mainItem.selected; // Sync SubItem selection with MainItem
    //     if (subItem.selected) {
    //       // Add SubItem to selectedSubItems
    //       this.selectedSubItems.push(subItem);
    //     } else {
    //       // Remove SubItem from selectedSubItems
    //       this.selectedSubItems = this.selectedSubItems.filter(item => item !== subItem);
    //     }
    //   });
    // }

    // Debugging logs
    console.log('Selected MainItems:', this.selectedMainItems);
    console.log('Selected SubItems:', this.selectedSubItems);
    console.log('Selected Rows for Profit:', this.selectedRowsForProfit);
  }

  //end new selection...............
  // to handle All Records Selection / Deselection 
  selectedAllRecords: MainItem[] = [];
  onSelectAllRecords(event: any): void {
    if (Array.isArray(event.checked) && event.checked.length > 0) {
      this.selectedAllRecords = [...this.mainItemsRecords];
      console.log(this.selectedAllRecords);
    } else {
      this.selectedAllRecords = [];
    }
  }

  onSubItemSelection(event: any, subItem: SubItem) {
    console.log(subItem);
    this.selectedSubItems.push(subItem);
  }
  //In Creation to handle shortTextChangeAlowlled Flag 
  onServiceNumberChange(event: any) {
    const selectedRecord = this.recordsServiceNumber.find(record => record.serviceNumberCode === this.selectedServiceNumber);
    if (selectedRecord) {
      this.selectedServiceNumberRecord = selectedRecord
      this.shortTextChangeAllowed = this.selectedServiceNumberRecord?.shortTextChangeAllowed || false;
      this.shortText = ""
    }
    else {
      console.log("no service number");
      //this.dontSelectServiceNumber = false
      this.selectedServiceNumberRecord = undefined;
    }
  }
  //In Update to handle shortTextChangeAlowlled Flag 
  onServiceNumberUpdateChange(event: any) {
    const updateSelectedRecord = this.recordsServiceNumber.find(record => record.serviceNumberCode === event.value);
    if (updateSelectedRecord) {
      this.updateSelectedServiceNumberRecord = updateSelectedRecord
      this.updateShortTextChangeAllowed = this.updateSelectedServiceNumberRecord?.shortTextChangeAllowed || false;
      this.updateShortText = ""
    }
    else {
      this.updateSelectedServiceNumberRecord = undefined;
    }
  }

  //In Creation SubItem to handle shortTextChangeAlowlled Flag 
  onServiceNumberChangeSubItem(event: any) {
    const selectedRecord = this.recordsServiceNumber.find(record => record.serviceNumberCode === this.selectedServiceNumberSubItem);
    if (selectedRecord) {
      this.selectedServiceNumberRecordSubItem = selectedRecord
      this.shortTextChangeAllowedSubItem = this.selectedServiceNumberRecordSubItem?.shortTextChangeAllowed || false;
      this.shortTextSubItem = ""
    }
    else {
      console.log("no service number");
      //this.dontSelectServiceNumber = false
      this.selectedServiceNumberRecordSubItem = undefined;
    }
  }
  //In Update SubItem to handle shortTextChangeAlowlled Flag 
  onServiceNumberUpdateChangeSubItem(event: any) {
    const updateSelectedRecord = this.recordsServiceNumber.find(record => record.serviceNumberCode === event.value);
    if (updateSelectedRecord) {
      this.updateSelectedServiceNumberRecordSubItem = updateSelectedRecord
      this.updateShortTextChangeAllowedSubItem = this.updateSelectedServiceNumberRecordSubItem?.shortTextChangeAllowed || false;
      this.updateShortTextSubItem = ""
    }
    else {
      this.updateSelectedServiceNumberRecordSubItem = undefined;
    }
  }

  onFormulaSelect(event: any) {
    const selectedRecord = this.recordsFormula.find(record => record.formula === this.selectedFormula);
    if (selectedRecord) {
      this.selectedFormulaRecord = selectedRecord
      console.log(this.selectedFormulaRecord);
    }
    else {
      console.log("no Formula");
      this.selectedFormulaRecord = undefined;
    }
  }
  onFormulaUpdateSelect(event: any) {
    const selectedRecord = this.recordsFormula.find(record => record.formula === event.value);
    if (selectedRecord) {
      this.updatedFormulaRecord = selectedRecord
      console.log(this.updatedFormulaRecord);
    }
    else {
      this.updatedFormulaRecord = undefined;
      console.log(this.updatedFormulaRecord);
    }
  }

  onFormulaSelectSubItem(event: any) {
    const selectedRecord = this.recordsFormula.find(record => record.formula === this.selectedFormulaSubItem);
    if (selectedRecord) {
      this.selectedFormulaRecordSubItem = selectedRecord
      console.log(this.selectedFormulaRecordSubItem);
    }
    else {
      console.log("no Formula");
      this.selectedFormulaRecordSubItem = undefined;
    }
  }
  onFormulaUpdateSelectSubItem(event: any) {
    const selectedRecord = this.recordsFormula.find(record => record.formula === event.value);
    if (selectedRecord) {
      this.updatedFormulaRecordSubItem = selectedRecord
      console.log(this.updatedFormulaRecordSubItem);
    }
    else {
      this.updatedFormulaRecordSubItem = undefined;
      console.log(this.updatedFormulaRecordSubItem);
    }
  }
  expandAll() {
    this.mainItemsRecords.forEach(item => this.expandedRows[item.invoiceMainItemCode] = true);
  }
  collapseAll() {
    this.expandedRows = {};
  }

  // Export to excel sheet:
  transformData(data: MainItem[]) {
    const transformed: MainItem[] = []

    data.forEach((mainItem) => {
      transformed.push({
        Type: 'Main Item',
        serviceNumberCode: mainItem.serviceNumberCode,
        description: mainItem.description,
        quantity: mainItem.quantity,
        unitOfMeasurementCode: mainItem.unitOfMeasurementCode,
        formulaCode: mainItem.formulaCode,
        amountPerUnit: mainItem.amountPerUnit,
        currencyCode: mainItem.currencyCode,
        total: mainItem.total,
        profitMargin: mainItem.profitMargin,
        totalWithProfit: mainItem.totalWithProfit,
        doNotPrint: mainItem.doNotPrint,
        invoiceMainItemCode: mainItem.invoiceMainItemCode,
        subItems: [],
        isPersisted: false
      });

      // Add subitems
      mainItem.subItems?.forEach(subItem => {
        transformed.push({
          Type: 'Sub Item',
          serviceNumberCode: subItem.serviceNumberCode,
          description: subItem.description,
          quantity: subItem.quantity,
          unitOfMeasurementCode: subItem.unitOfMeasurementCode,
          amountPerUnit: subItem.amountPerUnit,
          formulaCode: subItem.formulaCode,
          currencyCode: subItem.currencyCode,
          total: subItem.total ? subItem.total : 0,

          //profitMargin: mainItem.profitMargin,
          totalWithProfit: 0,
          // doNotPrint: subItem.doNotPrint,
          invoiceMainItemCode: mainItem.invoiceMainItemCode,
          subItems: [],
          isPersisted: false
        });
      });
    });

    return transformed;
  }

  exportExcel() {
    import('xlsx').then((xlsx) => {
      const transformedData = this.transformData(this.mainItemsRecords);
      const worksheet = xlsx.utils.json_to_sheet(transformedData);
      const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
      const ws = workbook.Sheets.data;
      if (!ws['!ref']) {
        ws['!ref'] = 'A1:Z1000';
      }
      const range = xlsx.utils.decode_range(ws['!ref']);
      let rowStart = 1;

      transformedData.forEach((row, index) => {
        if (row.Type === 'Main Item') {

          if (index + 1 < transformedData.length && transformedData[index + 1].Type === 'Sub Item') {
            ws['!rows'] = ws['!rows'] || [];
            ws['!rows'][index] = { hidden: false };
            ws['!rows'][index + 1] = { hidden: false };
          } else {
            ws['!rows'] = ws['!rows'] || [];
            ws['!rows'][index] = { hidden: false };
          }
        } else {
          ws['!rows'] = ws['!rows'] || [];
          ws['!rows'][index] = { hidden: false };
        }
      });

      const excelBuffer: any = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
      this.saveAsExcelFile(excelBuffer, 'Tendering BOQ');
    });
  }

  saveAsExcelFile(buffer: any, fileName: string): void {
    let EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
    let EXCEL_EXTENSION = '.xlsx';
    const data: Blob = new Blob([buffer], {
      type: EXCEL_TYPE
    });
    FileSaver.saveAs(data, fileName + '_export_' + new Date().getTime() + EXCEL_EXTENSION);
  }

  // handle Formula Parameters 
  showPopup: boolean = false;
  parameterValues: { [key: string]: number } = {};
  showPopupUpdate: boolean = false;
  parameterValuesUpdate: { [key: string]: number } = {};
  openPopup() {
    if (this.selectedFormulaRecord) {
      this.showPopup = true;
      for (const parameterId of this.selectedFormulaRecord.parameterIds) {
        this.parameterValues[parameterId] = 0;
        console.log(this.parameterValues);
      }
    }
    else if (this.selectedFormulaRecordSubItem) {
      this.showPopup = true;
      for (const parameterId of this.selectedFormulaRecordSubItem.parameterIds) {
        this.parameterValues[parameterId] = 0;
        console.log(this.parameterValues);
      }
    }
    else {
      this.showPopup = false;
    }
  }
  openPopupUpdate() {
    if (this.updatedFormulaRecord) {
      this.showPopupUpdate = true;
      console.log(this.showPopupUpdate);

      for (const parameterId of this.updatedFormulaRecord.parameterIds) {
        this.parameterValuesUpdate[parameterId] = 0;
        console.log(this.parameterValuesUpdate);
      }
    } else if (this.updatedFormulaRecordSubItem) {
      this.showPopupUpdate = true;
      console.log(this.showPopupUpdate);

      for (const parameterId of this.updatedFormulaRecordSubItem.parameterIds) {
        this.parameterValuesUpdate[parameterId] = 0;
        console.log(this.parameterValuesUpdate);
      }
    }
    else {
      this.showPopupUpdate = false;
    }
  }
  resultAfterTest?: number
  resultAfterTestUpdate?: number
  saveParameters() {
    if (this.selectedFormulaRecord) {
      console.log(this.parameterValues);
      const valuesOnly = Object.values(this.parameterValues)
        .filter(value => typeof value === 'number') as number[];
      console.log(valuesOnly);
      console.log(this.resultAfterTest);

      const formulaObject: any = {
        formula: this.selectedFormulaRecord.formula,
        description: this.selectedFormulaRecord.description,
        numberOfParameters: this.selectedFormulaRecord.numberOfParameters,
        parameterIds: this.selectedFormulaRecord.parameterIds,
        parameterDescriptions: this.selectedFormulaRecord.parameterDescriptions,
        formulaLogic: this.selectedFormulaRecord.formulaLogic,
        testParameters: valuesOnly
      };
      console.log(formulaObject);
      this._ApiService.patch<any>('formulas', this.selectedFormulaRecord.formulaCode, formulaObject).subscribe((response: Formula) => {
        console.log('formula updated:', response);
        this.resultAfterTest = response.result;
        console.log(this.resultAfterTest);
      });
      this.showPopup = false;
    }
    if (this.updatedFormulaRecord) {
      console.log(this.parameterValuesUpdate);
      const valuesOnly = Object.values(this.parameterValuesUpdate)
        .filter(value => typeof value === 'number') as number[];
      console.log(valuesOnly);
      console.log(this.resultAfterTestUpdate);
      const formulaObject: any = {
        formula: this.updatedFormulaRecord.formula,
        description: this.updatedFormulaRecord.description,
        numberOfParameters: this.updatedFormulaRecord.numberOfParameters,
        parameterIds: this.updatedFormulaRecord.parameterIds,
        parameterDescriptions: this.updatedFormulaRecord.parameterDescriptions,
        formulaLogic: this.updatedFormulaRecord.formulaLogic,
        testParameters: valuesOnly
      };
      console.log(formulaObject);
      this._ApiService.put<any>('formulas', this.updatedFormulaRecord.formulaCode, formulaObject).subscribe((response: Formula) => {
        console.log('formula updated:', response);
        this.resultAfterTestUpdate = response.result;
        console.log(this.resultAfterTestUpdate);

      });
      this.showPopupUpdate = false;
    }

    if (this.selectedFormulaRecordSubItem) {
      console.log(this.parameterValues);
      const valuesOnly = Object.values(this.parameterValues)
        .filter(value => typeof value === 'number') as number[];
      console.log(valuesOnly);
      console.log(this.resultAfterTest);

      const formulaObject: any = {
        formula: this.selectedFormulaRecordSubItem.formula,
        description: this.selectedFormulaRecordSubItem.description,
        numberOfParameters: this.selectedFormulaRecordSubItem.numberOfParameters,
        parameterIds: this.selectedFormulaRecordSubItem.parameterIds,
        parameterDescriptions: this.selectedFormulaRecordSubItem.parameterDescriptions,
        formulaLogic: this.selectedFormulaRecordSubItem.formulaLogic,
        testParameters: valuesOnly
      };
      console.log(formulaObject);
      this._ApiService.patch<any>('formulas', this.selectedFormulaRecordSubItem.formulaCode, formulaObject).subscribe((response: Formula) => {
        console.log('formula updated:', response);
        this.resultAfterTest = response.result;
        console.log(this.resultAfterTest);
      });
      this.showPopup = false;
    }

    if (this.updatedFormulaRecordSubItem) {
      console.log(this.parameterValuesUpdate);
      const valuesOnly = Object.values(this.parameterValuesUpdate)
        .filter(value => typeof value === 'number') as number[];
      console.log(valuesOnly);
      console.log(this.resultAfterTestUpdate);
      const formulaObject: any = {
        formula: this.updatedFormulaRecordSubItem.formula,
        description: this.updatedFormulaRecordSubItem.description,
        numberOfParameters: this.updatedFormulaRecordSubItem.numberOfParameters,
        parameterIds: this.updatedFormulaRecordSubItem.parameterIds,
        parameterDescriptions: this.updatedFormulaRecordSubItem.parameterDescriptions,
        formulaLogic: this.updatedFormulaRecordSubItem.formulaLogic,
        testParameters: valuesOnly
      };
      console.log(formulaObject);
      this._ApiService.put<any>('formulas', this.updatedFormulaRecordSubItem.formulaCode, formulaObject).subscribe((response: Formula) => {
        console.log('formula updated:', response);
        this.resultAfterTestUpdate = response.result;
        console.log(this.resultAfterTestUpdate);

      });
      this.showPopupUpdate = false;
    }

  }

  closePopup() {
    this.showPopupUpdate = false;
    this.showPopup = false;
  }
}


