import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ApiService } from '../shared/ApiService.service';
import { MainItem } from './invoice.model';
    
@Injectable()
export class InvoiceService {

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