#!/bin/bash
# =============================================
# Git Changelog Generator using Notes
# =============================================

echo "# Changelog"
echo ""

# You can limit to a range, e.g.: git rev-list v1.2.0..HEAD
for rev in $(git rev-list HEAD); do
  echo "## Commit: $(git log -1 --pretty=format:%h --abbrev-commit "$rev") - $(git log -1 --pretty=format:%s "$rev")"

  # Show notes from different namespaces
  for ns in changelog changelogs/features changelogs/bugs changelogs/changes changelogs/deprecations; do
    if git notes --ref="$ns" list "$rev" &>/dev/null; then
      echo ""
      case $ns in
      changelog) echo "**General**:" ;;
      changelogs/features) echo "**✨ Features**:" ;;
      changelogs/bugs) echo "**🐛 Bug Fixes**:" ;;
      changelogs/changes) echo "**🔄 Changes**:" ;;
      changelogs/deprecations) echo "**⚠️ Deprecations**:" ;;
      esac
      git notes --ref="$ns" show "$rev"
      echo ""
    fi
  done
  echo "--------------------------------------------------"
done
