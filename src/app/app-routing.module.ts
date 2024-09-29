import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { AuthComponent } from './auth/auth.component';
import { AuthGuard } from './auth/auth.guard';
import { InvoiceComponent } from './invoice/invoice.component';


const routes: Routes = [
  { path: '', component: AppComponent },
  { path: 'login', component: AuthComponent },
  { path: 'tendering', component: InvoiceComponent },


];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
