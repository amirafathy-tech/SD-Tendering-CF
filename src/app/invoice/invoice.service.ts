import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ApiService } from '../shared/ApiService.service';
import { MainItem, SubItem } from './invoice.model';
    
@Injectable()
export class InvoiceService {

  private mainItems: MainItem[] = [];

  // Add a new MainItem
  addMainItem(item: MainItem) {
    item.invoiceMainItemCode = this.mainItems.length + 1;
    this.mainItems.push(item);
    console.log(this.mainItems);
  }

  // Add a SubItem to a specific MainItem by id
  addSubItemToMainItem(mainItemId: number, subItem: SubItem) {
    const mainItem = this.mainItems.find(item => item.invoiceMainItemCode === mainItemId);
    if (mainItem) {
      // subItem.invoiceSubItemCode = Date.now();
      subItem.invoiceMainItemCode=mainItemId
      mainItem.subItems.push(subItem);
      console.log(`SubItem added to MainItem with ID: ${mainItemId}`, mainItem);
      return true;  // Indicate success
    } else {
      console.error(`MainItem with ID: ${mainItemId} not found.`);
      return false;  // Indicate failure
    }
  }

  // Retrieve all MainItems
  getMainItems(): MainItem[] {
    return this.mainItems;
  }



    recordsChanged = new Subject<MainItem[]>();
    startedEditing = new Subject<number>();
    constructor(private apiService: ApiService) { }
    private recordsApi!: MainItem[]
  
    getRecords() {
      this.apiService.get<MainItem[]>('invoices').subscribe(response => {
        console.log(response);
        this.recordsApi = response;
        this.recordsChanged.next(this.recordsApi);
      });
    }
  
    getRecord(index: number): Observable<MainItem> {
      return this.apiService.getID<MainItem>('mainitems', index);
    }
   
    addRecord(record: MainItem) {
      this.apiService.post<MainItem>('mainitems', record).subscribe((response: MainItem) => {
        console.log('mainItem  created:', response);
        this.getRecords();
        return response
      });
    }
  
    updateRecord(index: number, newRecord: MainItem) {
      this.apiService.put<MainItem>('mainitems', index, newRecord).subscribe(response => {
        console.log('mainitem updated:',response);
        this.getRecords()
      });
    }
  
    deleteRecord(index: any) {
      this.apiService.delete<MainItem>('mainitems', index).subscribe(response => {
        console.log('mainitem deleted:',response);
        this.getRecords()
      });
    }
};