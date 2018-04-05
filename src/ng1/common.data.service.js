(function() {
  'use strict';

angular.module('web').service('CommonDataService', CommonDataService);

function CommonDataService(ApiService2, jsonapi_parser) {
	var self = this;

    self.logout = function() {
        ApiService2.get('logout', "", [], {"base": "auth"}).toPromise();
    }

    self.getUserSchema = function(study) {
        return ApiService2.post('admin/users', {'get_schema': true}).toPromise();
    }

    self.getUsers = function() {
        return jsonapi_parser.parseResponse(ApiService2.get('admin/users'));
    };

    self.saveUser = function(data) {
        return ApiService2.post('admin/users', data).toPromise();
    };

    self.deleteUser = function(user) {
        return ApiService2.delete('admin/users', user).toPromise();
    };

    self.updateUser = function(user, data) {
        return ApiService2.put('admin/users', user, data).toPromise();
    };

    self.getUserRoles = function(query) {
        return ApiService2.get('role', query).toPromise();
    };

    self.getUserGroups = function(query) {
        return ApiService2.get('group', query).toPromise();
    };
	
};

CommonDataService.$inject = ["ApiService2", "jsonapi_parser"];

})();