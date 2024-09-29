import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
// import { AlertService } from 'src/app/shared/alert.service';

@Component({
    selector: 'app-register',
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
    form!: FormGroup;
    loading = false;
    submitted = false;

    constructor(
        private formBuilder: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private authService: AuthService,
       // private alertService: AlertService
    ) { }

    ngOnInit() {
        this.form = this.formBuilder.group({
            firstName: ['', Validators.required],
            lastName: ['', Validators.required],
            username: ['', Validators.required],
            email: ['', [Validators.required]]
        });
    }
    
    get f() { return this.form.controls; }

    onSubmit() {
        this.submitted = true;
       // this.alertService.clear();
        if (this.form.invalid) {
            return;
        }

        this.loading = true;
        this.authService.signUp(this.f['email'].value, this.f['lastName'].value, this.f['firstName'].value, this.f['username'].value)
            .pipe(first())
            .subscribe({
                next: (response) => {
                    console.log(response);
                   // this.alertService.success('Registration Successful', { keepAfterRouteChange: true });
                    //this.router.navigate(['/login'], { relativeTo: this.route });
                    this.loading = false;
                },
                error: error => {
                   // this.alertService.error(error);
                    this.loading = false;
                }
            });
        // .pipe(first())
        // .subscribe({
        //     next: () => {
        //         //this.alertService.success('Registration successful', { keepAfterRouteChange: true });
        //         this.router.navigate(['../login'], { relativeTo: this.route });
        //     },
        //     error: error => {
        //        // this.alertService.error(error);
        //         this.loading = false;
        //     }
        // });
    }
}
