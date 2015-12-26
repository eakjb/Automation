#!/bin/bash
textReset=$(tput sgr0)
textGreen=$(tput setaf 2)
message_info () {
  echo "${textGreen}[my-app]${textReset} $1"
}

message_info "Running npm install..."
npm install

message_info "Running bower install..."
bower install

message_info "Running a grunt build..."
grunt build


message_info "Initializing Cordova..."
cordova create

message_info "Adding platforms..."
cordova platform add ios
cordova platform add android
cordova platform add amazon-fireos

message_info "Installing plugins..."
cordova plugin add org.apache.cordova.statusbar
