/**
 * Created by jakebillings on 7/30/15.
 */
angular.module('com.eakjb.homeAutomation', ['ngResource'])
    .factory('APIInterceptor', ['$q', function ($q) {
        return {
            'response': function (response) {
                if (response.data.isWrapped && response.data.data) {
                    response.data = response.data.data;
                }
                return response;
            }
        }
    }])
    .config(['$httpProvider', function ($httpProvider) {
        $httpProvider.interceptors.push('APIInterceptor');
    }])

    .factory('API', ['$location', '$resource', function ($location, $resource) {
        var API = {};

        API.HAL = $location.search()['HAL'];
        if (!API.HAL) API.HAL = '/';

        API.socket = io(API.HAL);
        API.socket.on('notification', function (data) {
            if (!data.priority||data.priority>100) {
                attemptNotification(data);
            }
        });

        API.Node = $resource(API.HAL + 'api/v1/Nodes/:node_id');
        API.Recipient = $resource(API.HAL + 'api/v1/Recipients/:_id');

        API.nodes = API.Node.query();
        API.nodes.$promise.then(function (nodes) {
            angular.forEach(nodes, function (node) {
                node.Info = $resource(node.address, {});
                node.Input = $resource(node.address + '/inputs/:input_id');
                node.Output = $resource(node.address + '/outputs/:output_id',
                    {output_id: '@output_id'}, {
                        pushState: {
                            method: 'PUT',
                            url: node.address + '/outputs/:output_id/state'
                        }
                    });
            });
        });

        return API;
    }])

    .controller('NodeListController', ['$scope', '$q', 'API', function ($scope, $q, API) {
        $scope.nodes = [];

        $scope.load = function () {
            $scope.nodes = [];
            $scope.loaded = false;
            $scope.error = undefined;

            API.nodes.$promise.then(function (nodes) {
                $scope.loaded = true; //Node list has loaded
                $scope.error = undefined;

                //For each node metadata
                angular.forEach(nodes, function (_node) {

                    //Is it online?
                    if (!_node.offline) {

                        //Initial info
                        var node = _node.Info.get();
                        node.loaded = false; //Has the node loaded?
                        node.error = undefined;

                        node.$promise.then(function () {
                            //Not done yet
                        }, function (e) {
                            node.loaded = true;
                            node.error = e.data;
                        });

                        var loadNode = function () {
                            node.loaded = false;
                            node.error = undefined;
                            var promises = [];

                            if (node.outputs) {

                                node.outputs = _node.Output.query();
                                node.outputs.$promise.then(function (outputs) {
                                    angular.forEach(outputs, function (output) {
                                        output._update = function (key) {
                                            var states = output.states;
                                            if (typeof states === 'object') {
                                                states = [];
                                                angular.forEach(output.states, function (state) {
                                                    states.push(state);
                                                });
                                            }
                                            output.state = states.filter(function (state) {
                                                return state[key] === output.state[key];
                                            })[0];
                                            node.loaded = false;
                                            _node.Output.pushState({
                                                output_id: output.output_id,
                                                value: output.state.value
                                            });//.$promise.then(loadNode, loadNode);
                                        };
                                    });
                                });
                                promises.push(node.outputs.$promise);
                            }
                            if (node.inputs) {
                                node.inputs = _node.Input.query();
                                node.inputs.$promise.then(function (inputs) {

                                    angular.forEach(inputs, function (input) {
                                        input._show = !input._hidden;
                                        
                                        if (input._type) return;

                                        //Temperature calculations
                                        if (input.value&&input.max) {
                                            input._style = {
                                                width: input.value / (input.max - input.min) * 100 + '%'
                                            };

                                            return input._type = 'number';
                                        }

                                        if (input.connectionStatus) {
                                            return input._type = 'trackable';
                                        }

                                        return input._type = 'other';
                                        
                                        
                                    });
                                });
                                promises.push(node.inputs.$promise);
                            }

                            $q.all(promises).then(function () {
                                node.loaded = true;
                                node.error = false;
                            }, function (e) {
                                console.log("Error", e);
                                $scope.loaded = true;
                                node.error = e.data;
                            });
                        };

                        node.$promise.then(loadNode);
                        API.socket.on('notification',loadNode);
                        $scope.nodes.push(node);
                    }
                });
            }, function (e) {
                $scope.loaded = true;
                $scope.error = e;
            });
        };
        $scope.load();

    }])
    .controller('RecipientListController', ['$scope', 'API', function($scope,API) {
        $scope.recipients = API.Recipient.query();
        $scope.recipientUpdate = function (recipient) {
            API.Recipient.save({_id:recipient._id},recipient);
        };
    }]);