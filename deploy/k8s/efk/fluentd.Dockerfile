FROM fluent/fluentd-kubernetes-daemonset:v1-debian-elasticsearch

COPY /standup-notifier.conf /fluentd/etc/conf.d/standup-notifier.conf