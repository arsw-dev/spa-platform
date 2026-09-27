variable "name" {
  description = "Prefix for account-level resource names (e.g. the plan role)"
  type        = string
}

variable "state_bucket_name" {
  description = "S3 bucket for Terraform state"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository (owner/repo) whose pull requests may assume the plan role"
  type        = string
}

variable "github_subject_prefix" {
  description = "The repository's OIDC subject prefix, as GitHub reports it (gh api repos/<owner>/<repo>/actions/oidc/customization/sub --jq .sub_claim_prefix). Repos created with GitHub's immutable subjects use repo:<owner>@<owner id>/<repo>@<repo id>. Null means the legacy repo:<github_repo>"
  type        = string
  default     = null

  validation {
    condition     = var.github_subject_prefix == null || can(regex("^repo:[A-Za-z0-9-]+(@[0-9]+)?/[A-Za-z0-9._-]+(@[0-9]+)?$", var.github_subject_prefix))
    error_message = "github_subject_prefix must look like repo:owner/repo or repo:owner@123/repo@456, without a trailing colon."
  }
}

variable "state_keys" {
  description = "State file keys in the state bucket that the plan role may read, one per Terraform root (e.g. site/terraform.tfstate)"
  type        = list(string)

  validation {
    condition     = length(var.state_keys) > 0 && alltrue([for key in var.state_keys : !strcontains(key, "*")])
    error_message = "state_keys must name at least one exact key, without wildcards."
  }
}

variable "create_github_oidc_provider" {
  description = "Create the GitHub Actions OIDC provider. Set false if the account already has one (AWS allows only one per URL)"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Extra tags for taggable resources. managed_by is always set"
  type        = map(string)
  default     = {}
}
