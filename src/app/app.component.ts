import { Component, OnInit, Injector } from '@angular/core';
import { VERSION as NG_VERSION } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { AuthService } from './app.auth.service';
import { NavbarComponent } from './app.navbar';
import { version as NGJS_VERSION } from 'angular';

@Component({
  selector: 'rapydo',
  providers: [AuthService, NavbarComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

    private rootScope: any
	private user: any;

	versions = {
		angularjs: NGJS_VERSION.full,
		angular: NG_VERSION.full
	}

	constructor(
			private auth: AuthService,
			private injector: Injector,	// Only required for AngularJS, remove me!
			private ref: ChangeDetectorRef) {
		this.user = auth.getUser();
		auth.userChanged.subscribe(user => this.changeLogged(user));
	}

	ngOnInit() {

		this.rootScope = this.injector.get('$rootScope');

	}

	changeLogged(user: any) {

		if (user == this.auth.LOGGED_OUT) {
			console.log("Received <" + user  + "> event");
			this.user = undefined;
			this.ref.detectChanges();

		} else if (user == this.auth.LOGGED_IN) {
			console.log("Received <" + user  + "> event");
			this.user = this.auth.getUser();
			this.ref.detectChanges();

		} else {
			console.log("Received unknown user event: <" + user  + ">");
		}

		this.rootScope.profile = this.user;

	}

}
