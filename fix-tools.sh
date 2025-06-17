#!/bin/bash

# Fix all tool files by adding braces to make them return void
for file in $(find src/tools -name "*.ts" -type f ! -name "index.ts"); do
  # Check if file needs fixing by looking for the pattern
  if grep -q ": void =>$" "$file"; then
    # Add opening brace
    sed -i 's/: void =>$/: void => {/' "$file"
    # Add closing brace at the end
    echo "}" >> "$file"
    echo "Fixed: $file"
  fi
done