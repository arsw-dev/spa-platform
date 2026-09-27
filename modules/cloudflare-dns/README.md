# cloudflare-dns

Manages DNS records in a Cloudflare zone. It only touches the records it's given: everything else in the zone (email, verification records, other sites) is left alone.

## Usage

With `static-site`, as two calls: validation records first, then the domain records.

```hcl
provider "cloudflare" {} # reads CLOUDFLARE_API_TOKEN

module "certificate_dns" {
  source = "github.com/arsw-dev/spa-platform//modules/cloudflare-dns?ref=v1.0.0-rc.2"

  zone_id = var.cloudflare_zone_id
  records = {
    for domain, record in module.site.certificate_validation_records : domain => {
      name    = record.name
      type    = record.type
      content = record.value
    }
  }
}

module "site_dns" {
  source = "github.com/arsw-dev/spa-platform//modules/cloudflare-dns?ref=v1.0.0-rc.2"

  zone_id = var.cloudflare_zone_id
  records = {
    for domain, record in module.site.domain_records : domain => {
      name    = record.name
      type    = record.type
      content = record.value
    }
  }
}
```

The keys (here, the domains) must be known at plan time; the values can be unknown until apply. That's why `static-site`'s outputs are keyed by domain.

## Inputs

| Name      | Type                                                             | Default  | Description                                                                                                                                    |
| --------- | ---------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `zone_id` | `string`                                                         | required | Zone ID from the zone's overview page (not secret)                                                                                             |
| `records` | `map(object({ name, type, content, proxied = false, ttl = 1 }))` | required | Records by stable key. One record per key; multi-value records such as several MX entries aren't supported. Proxied records must use `ttl = 1` |

## Outputs

| Name           | Description                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| `record_names` | Record names by key. Pass them to `static-site`'s `validation_record_fqdns` so validation waits for the records |

## Notes

- **DNS-only by default.** Proxying would put Cloudflare's CDN in front of CloudFront. Proxy a record only for a Cloudflare feature that needs it, such as a redirect rule.
- **Existing records.** Cloudflare won't create an A, AAAA or CNAME at a name that already has one. Import existing records (`import { to = module.site_dns.cloudflare_dns_record.this["<key>"], id = "<zone id>/<record id>" }`) or remove them before the apply.
- **Tokens.** Applies need DNS:Edit on the zone. Plans only need DNS:Read, so CI should use a read-only token.
