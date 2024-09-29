import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
//import { AlertService } from 'src/app/shared/alert.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  providers:[]
})

export class LoginComponent implements OnInit {

  form!: FormGroup;
  loading = false;
  submitted = false;
  error!: string;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    // private alertService: AlertService
  ) { }

  ngOnInit() {
    this.form = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', [Validators.required, Validators.min(6)]]
    });
  }

  // for easy access to form fields
  get f() { return this.form.controls; }

  onSubmit() {
    this.submitted = true;
     // reset alerts on submit
    // this.alertService.clear();

    if (this.form.invalid) {
      return;
    }

    this.loading = true;
    this.authService.signIn(this.f['username'].value, this.f['password'].value)
      .pipe(first())
      .subscribe({
        next: () => {
          //this.loading = false;
          this.router.navigate(['/tendering']);
        },
        error: error => {
          //this.error = error;
         // this.alertService.error(error);
          this.loading = false;
        }
      });
  }
}
