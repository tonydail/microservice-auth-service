#!/bin/bash

# Step 1: Ensure GitHub CLI (gh) is installed on the system
if ! command -v gh &> /dev/null; then
    echo "❌ Error: GitHub CLI (gh) is not installed. Please install it first." >&2
    exit 1
fi

# Step 2: Check if nektos/gh-act is in the list of installed extensions
if gh extension list | grep -q "nektos/gh-act"; then
    echo "✅ The 'nektos/gh-act' extension is already installed."
else
    echo "⏳ 'nektos/gh-act' not found. Installing..."
    
    # Step 3: Install the extension
    if gh extension install nektos/gh-act; then
        echo "🎉 Successfully installed 'nektos/gh-act'!"
    else
        echo "❌ Failed to install 'nektos/gh-act'." >&2
        exit 1
    fi
fi

ACT_CONFIG_FILE=".actrc"

# Save the configuration using a here document
cat << 'EOF' > "$ACT_CONFIG_FILE"
# Use a larger runner image that supports service containers
-P ubuntu-latest=catthehacker/ubuntu:full-latest

# Show verbose output
-v

# Container architecture
--container-architecture linux/amd64
EOF

gh act pull_request -W .github/workflows/pr-run-tests.yml

rm -f "$ACT_CONFIG_FILE"