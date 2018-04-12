(function() {
  'use strict';

angular.module('web')
//.service('auth', authService)
.controller('LoginController', LoginController)
.controller('RegisterController', RegisterController)
.controller('LogoutController', LogoutController)
.controller('PwdResetController', PwdResetController)

.config(function($authProvider) {

    $authProvider.loginUrl = authApiUrl + "/login"
    $authProvider.tokenName = 'token';
    $authProvider.tokenRoot = 'Response.data'

	$authProvider.oauth1({
		  name: null,
		  url: null,
		  authorizationEndpoint: null,
		  redirectUri: null,
		  type: null,
		  popupOptions: null
	});

})
;

//////////////////////////////
function LoginController($scope, $log, $window,
    $auth, $document, $timeout, $state, noty)
{

    // Init controller
    $log.debug("Login Controller");
    var self = this;

    self.setDefaultForm = function() {
        self.panelTitle = "Provide your credentials"
        self.buttonText = "Signin"
        self.askUsername = true;
        self.askPassword = true;
        self.askNewPassword = false;
        self.askTOTP = false;
        // allowRegistration is defined in common.globals.js and overriding in routing.extra.js
        self.allowRegistration = allowRegistration;
        self.allowPasswordReset = allowPasswordReset;
        self.userMessage = null;
        self.qr_code = null;

        self.user = {
           new_password: null,
           password_confirm: null,
           totp_code: null,
        };
    }
    self.setDefaultForm();

    // Init the models


    // In case i am already logged, skip
    if ($auth.isAuthenticated())
    {
        $timeout(function () {
            $log.debug("Already logged");
            $state.go(loggedLandingPage);
        });
    }

    // LOGIN LOGIC
    self.check = function() {

        var credentials = self.user;
        $log.debug("Requested with", credentials);

        $auth.login(credentials).then(
            function (response) {
                self.userMessage = null;

                // Now we can check again reloading this page
                $window.location.reload();
                console.log("DO YOU SEE ME?")
                noty.showAll(response.data.Response.errors, noty.WARNING);

            }, function(response) {

                if (response.status == 409) {
                    $log.warn("Auth raised errors", response);
                    noty.showAll(response.data.Response.errors, noty.WARNING);
                } else if (response.status == 403) {
                    $log.warn("Auth not completed", response);

                    // self.userMessage = "Unrecognized response from server"
                    self.userMessage = ""

                    if (typeof response.data.Response.data.actions === 'undefined') {
                        noty.showError(self.userMessage)
                        noty.showAll(response.data.Response.errors, noty.ERROR);
                    } else if (! (response.data.Response.data.actions instanceof Array)) {
                        noty.showError(self.userMessage)
                        noty.showAll(response.data.Response.errors, noty.ERROR) 
                    // } else if (typeof response.data.Response.data.token === 'undefined') {
                    //     noty.showError(self.userMessage)
                    //     noty.showAll(response.data.Response.errors, noty.ERROR);
                    } else {
                        var originalUerMessage = self.userMessage
                        // self.userMessage = response.data.Response.errors[0];

                        // var temp_token = response.data.Response.data.token
                        var actions = response.data.Response.data.actions

                        for (var i=0; i<actions.length; i++) {
                            var action = actions[i];
                            var notyLevel = noty.ERROR;
                            if (action == 'FIRST LOGIN') {
                                self.panelTitle = "Please change your temporary password"
                                self.buttonText = "Change"
                                self.askUsername = false;
                                self.askPassword = false;
                                self.askNewPassword = true;
                                notyLevel = noty.WARNING;

                            } else if (action == 'PASSWORD EXPIRED') {
                                self.panelTitle = "Your password is expired, please change it"
                                self.buttonText = "Change"
                                self.askUsername = false;
                                self.askPassword = false;
                                self.askNewPassword = true;
                                notyLevel = noty.WARNING;

                            } else if (action == 'TOTP') {
                                self.panelTitle = "Provide the verification code"
                                self.buttonText = "Authorize"
                                self.askUsername = false;
                                self.askPassword = false;
                                self.askTOTP = true
                                notyLevel = noty.WARNING;
                                
                            } else {
                                self.userMessage = originalUerMessage;
                                noty.showError(self.userMessage)
                            }
                            // noty.showAll(response.data.Response.errors, notyLevel);

                        }

                        if (response.data.Response.data.qr_code) {

                            self.qr_code = response.data.Response.data.qr_code;

                        }
                        // $auth.setToken(temp_token)
                    }

                } else {
                    // $log.warn("Auth: failed", response);
                    self.setDefaultForm();
                    noty.showAll(response.data.Response.errors, noty.ERROR);
                    self.userMessage = response.data.Response.errors[0];
                }

            }
        );
    }

    self.sendTOTP = function() {
        console.log("TOTP not yet implemented")
    }

    self.firstLogin = function() {
        console.log("firstLogin not yet implemented")
    }

    self.changePassword = function() {
        console.log("changePassword not yet implemented")
    }
}

function RegisterController($scope, $log, $auth, api, noty)
{
    // Init controller
    var self = this;
    self.errors = null;
    self.userMessage = null;
    $log.debug("Register Controller");

    // Skip if already logged
    if ($auth.isAuthenticated())
    {
        $timeout(function () {
            $log.debug("Already logged");
            $state.go(loggedLandingPage);
        });
    }

    // Init the model
    self.user = {
       email: null,
       name: null,
       surname: null,
       password: null,
       password_confirm: null,
    };

    self.request = function()
    {
        var credentials = self.user;
        if (credentials.name == null || credentials.surname == null)
            return false;

        $log.debug("Requested registration:", credentials);

        api.apiCall(api.endpoints.register, 'POST', credentials, null, true)
         .then(
            function(response) {
                $log.debug("REG Success call", response);

                if (response.status > 210) {
                    var errors = response.data.errors;
                    $log.warn("Registration: failed", errors);
                    self.errors = errors;
                    noty.showError("Failed to register...")
                } else {
                    noty.showSuccess("New user created")
                    self.errors = null;
                    self.userMessage =
                        "Account registered. Pending admin approval.";
                }
            }
        );

    }
}

function PwdResetController(
    $scope, $timeout, $state, $log, $auth, $stateParams, api, noty) {
    // Init controller
    var self = this;

    // Skip if already logged
    if ($auth.isAuthenticated())
    {
        $timeout(function () {
            $log.debug("Already logged");
            $state.go(loggedLandingPage);
        });

        return
    }

    var token = $stateParams.token;

    if (token) {

        api.apiCall(api.endpoints.reset, 'PUT', null, token).then(
            function(response) {
                self.token = token
                noty.extractErrors(response, noty.WARNING);
            },
            function(out_data) {
                self.token = undefined
                self.invalid_token = out_data.errors[0];
            }
        );


    }
    self.changePassword = function() {

        if (self.newPwd != self.confirmPwd) {
            noty.showError("New password does not match with confirmation");
            return false;
        }

        var data = {}
        data["new_password"] = self.newPwd;
        data["password_confirm"] = self.confirmPwd;

        api.apiCall(api.endpoints.reset, 'PUT', data, self.token).then(
            function(out_data) {
                self.newPwd = ""
                self.confirmPwd = ""
                noty.showSuccess("Password successfully changed. Please login with your new password")
                $state.go("public.login");
                return true;
            },
            function(out_data) {
                noty.extractErrors(out_data, noty.ERROR);
                return false;
            }
        );
    };


    // Init the model
    self.reset_email = null;
    self.reset_message = null;

    self.request = function()
    {
        if (self.reset_email == null)
            return false;

        var data = {"reset_email": self.reset_email};
        api.apiCall(api.endpoints.reset, 'POST', data).then(
            function(response) {
                self.reset_message = response.data;
                noty.extractErrors(response, noty.WARNING);
            },
            function(out_data) {
                noty.extractErrors(out_data, noty.ERROR);
            }
        );
    }
}

function LogoutController($scope, $rootScope, $log, $auth, $window, $uibModal, $state, api, noty)
{
    // Init controller
    $log.debug("Logout Controller");
    var self = this;

    function DialogController($scope, $uibModalInstance) {
        $scope.cancel = function() {
          $uibModalInstance.dismiss();
        };
        $scope.confirm = function(answer) {
          $uibModalInstance.close(answer);
        };
    }
    self.showConfirmDialog = function() {
        var template = "<div class='panel panel-danger text-center' style='margin-bottom:0px;'>";
            template+= "<div class='panel-heading'>Logout request</div>";
            template+= "<div class='panel-body'><h4>Do you really want to close this session?</h4></div>";
            template+= "<div class='panel-footer'>";

            template+= "<div class='row'>";
            template+= "<div class='col-xs-4 col-xs-offset-2'>";
            template+= "<button class='btn btn-danger' ng-click='confirm()'>Yes</button>";
            template+= "</div>";
            template+= "<div class='col-xs-4'>";
            template+= "<button class='btn btn-default' ng-click='cancel()'>No</button>";
            template+= "</div>";

            template+= "</div>";
            template+= "</div>";

        return $uibModal.open({
          controller: DialogController,
          template: template,
          parent: angular.element(document.body),
          clickOutsideToClose:true
        }).result;
    }

    // Log out satellizer
    self.exit = function() {

        self.showConfirmDialog().then(
            function(answer) {
                api.apiCall(api.endpoints.logout, 'GET', undefined, undefined, true) .then(
                    function(response) {
                        $log.info("Logging out", response);

                        $auth.logout().then(function() {
                            $log.debug("Token cleaned:", $auth.getToken());
                        });
                        $window.location.reload();
                        $rootScope.logged = false;
                        //$state.go('welcome');
                    }, function(error) {
                        $log.warn("Error for logout", error);
                        noty.showAll([error.data], noty.ERROR);
                    }
                );
            },
            function() {
                // user did'nt confirmed logout request
            }
        );


    }

}

// THE END
})();