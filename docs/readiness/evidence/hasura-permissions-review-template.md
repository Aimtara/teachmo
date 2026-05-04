# Hasura Permissions Review Evidence Template

- Environment:
- Review date:
- Reviewer:
- Hasura project/endpoint:
- Metadata SHA/export hash:

## Role matrix

| Role | Table/action tested | Expected | Actual | PASS/FAIL | Evidence link |
| --- | --- | --- | --- | --- | --- |
| parent | tenant-scoped student read | allow own scoped records only | | | |
| teacher | class roster read | allow assigned classes only | | | |
| partner | partner submissions | no cross-partner access | | | |
| school_admin | school records | school scope only | | | |
| district_admin | district records | district scope only | | | |
| system_admin | audited admin access | allow with audit | | | |

## Required evidence

- Metadata export diff against repo.
- Forbidden-access screenshots or curl outputs.
- Allowed-access screenshots or curl outputs.
- Any drift remediation PR/run link.
