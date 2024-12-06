#!/bin/bash

# Install dependencies
yarn install

# install starship deps
yarn starship install

# set kubernetes context to Docker Desktop
kubectl config use-context docker-desktop

# setup starship
yarn starship setup
