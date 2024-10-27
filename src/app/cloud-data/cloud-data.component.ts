import { Component } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { NavigationExtras, Router } from '@angular/router';
import { ApiService } from '../shared/ApiService.service';

@Component({
  selector: 'app-cloud-data',
  templateUrl: './cloud-data.component.html',
  styleUrls: ['./cloud-data.component.css']
})
export class CloudDataComponent {


  nonNegativeValidator(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null => {
      const value = control.value;
      return value !== null && value < 0 ? { 'negativeValue': true } : null;
    };
  }

  cloudData: FormGroup = new FormGroup({
    document: new FormControl(null, [Validators.required, this.nonNegativeValidator()]),
    item: new FormControl(null, [Validators.required, this.nonNegativeValidator()])
  });

  customerId!:number;

  constructor(private router: Router,private _ApiService: ApiService,) {
  }

  nextPage(cloudData: FormGroup) {

    console.log(cloudData.value);

    this._ApiService.get<any>(`mainitems/${cloudData.value.document}/${cloudData.value.item}`).subscribe(response => {
      console.log(response);
      console.log(response.d.SoldToParty);    
      this.customerId=response.d.SoldToParty
    });

       const navigationExtras: NavigationExtras = {
        state: {
         documentNumber:cloudData.value.document,
         itemNumber:cloudData.value.item,
         customerId:this.customerId
        }
      };
      console.log(navigationExtras);
    this.router.navigate(['tendering'],navigationExtras);
  
  }
}
