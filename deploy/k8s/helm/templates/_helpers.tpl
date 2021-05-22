{{- define "env.main" }}
- name: DEBUG
  value: "{{ .Values.debug }}"
- name: HOST
  value: https://{{ .Values.domain }}
- name: REDIS_HOST
  value: {{ .Values.redis.host }}
{{- end }}
{{- define "env.slack" }}
- name: SLACK_CLIENT_ID
  valueFrom:
    secretKeyRef:
      name: slack-api-secret
      key: client-id
- name: SLACK_SECRET
  valueFrom:
    secretKeyRef:
      name: slack-api-secret
      key: secret
- name: SLACK_SIGNING_SECRET
  valueFrom:
    secretKeyRef:
      name: slack-api-secret
      key: signing-secret
{{- end }}
{{- define "env.db" }}
- name: DB_HOST
  value: {{ .Values.pg.host }}
- name: DB_DATABASE
  value: {{ .Values.pg.database }}
- name: DB_USERNAME
  value: {{ .Values.pg.username }}
- name: DB_PASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ .Values.pg.passwordSecret.name }}
      key: {{ .Values.pg.passwordSecret.key }}
{{- end }}