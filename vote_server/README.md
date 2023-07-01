# safe-vote

## Getting started

1. Make sure your kubernetes cluster is up: `kubectl cluster-info`. If it isn't, restart it, for example with `minikube stop && minikube start`
2. Make sure there's an empty namespace for the app: `kubectl create namespace safe-vote`
3. Run the app: `helm upgrade --install safe-vote . -n safe-vote`