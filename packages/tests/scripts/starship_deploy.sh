#!/bin/bash

# sanity check
kubectl get nodes
yarn starship get-pods

# deploy starship
yarn starship deploy

# wait til STATUS=Running
yarn starship get-pods

# port forwarding
yarn starship start-ports

# check pids
yarn starship port-pids
