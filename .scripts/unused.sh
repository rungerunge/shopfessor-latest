#!/bin/bash

# Extract model names from schema.prisma
models=$(grep -E '^model[[:space:]]+[A-Za-z_]+' prisma/schema.prisma | awk '{print $2}')

# Folder to search for usage
search_dir="./app"

# Check each model for usage
for model in $models; do
  # Lowercase the first letter to match Prisma client syntax
  camel_model="$(echo "${model:0:1}" | tr '[:upper:]' '[:lower:]')${model:1}"

  # Search for usage of this model in the code
  count=$(grep -r "prisma.${camel_model}" "$search_dir" | wc -l)

  if [[ "$count" -eq 0 ]]; then
    echo "❌ Unused model: $model"
  else
    echo "✅ Used model: $model"
  fi
done
