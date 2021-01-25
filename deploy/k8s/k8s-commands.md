### kubectl apply commands in order
    kubectl create namespace standup
    kubectl -n standup apply -f secret/postgres-secret.yaml
    kubectl -n standup apply -f volume/postgres-volume.yaml
    kubectl -n standup apply -f deployment/postgres.yaml
    kubectl -n standup exec -it postgres-deployment-6b6fdfd6c-dhbp7 -- bash
    
    kubectl -n standup apply -f secret/slack-api-secrent.yaml
    kubectl -n standup apply -f deployment/radis.yaml
    kubectl -n standup apply -f deployment/standup-notifier.yaml
    kubectl -n standup apply -f deployment/ui.yaml

### kubectl get commands

    kubectl get pod
    kubectl get pod --watch
    kubectl get pod -o wide
    kubectl get service
    kubectl get secret
    kubectl get all | grep postgres

### kubectl debugging commands

    kubectl describe pod postgres-deployment-xxxxxx
    kubectl describe service postgres-service
    kubectl logs postgres-xxxxxx

### give a URL to external service in minikube

    minikube service postgres-service
