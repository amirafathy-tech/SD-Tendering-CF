import { Component } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { NavigationExtras, Router } from '@angular/router';

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

  constructor(private router: Router) {
  }

  nextPage(cloudData: FormGroup) {

    console.log(cloudData.value);

       const navigationExtras: NavigationExtras = {
        state: {
         documentNumber:cloudData.value.document,
         itemNumber:cloudData.value.item,
        }
      };
      console.log(navigationExtras);
    this.router.navigate(['tendering'],navigationExtras);
  
  }
}
