import { Component } from '@angular/core';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'BTP-SD-APP';

  isLoggedIn: boolean = false;

  constructor(private authService: AuthService) {
    this.authService.loggedInUser.subscribe(loggedInUser => {
      this.isLoggedIn = !!loggedInUser;
    });
  }
}
