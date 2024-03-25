#!/bin/bash


# Source database name
database_name="clubhouse"

echo "Running mysqldump for \"$database_name\""



# Get the current date and time
current_date=$(date +"%Y-%m-%d_%H-%M-%S")

# Set the directory where the file should be written
output_dir="../dumps"

# Check if the directory exists, if not exit with an error
if [ ! -d "$output_dir" ]; then
    echo "Error: Directory $output_dir does not exist."
    exit 1
fi

# Set the output file name
output_file="${output_dir}/mysql_dump_${database_name}_${current_date}.sql"

container="clubhouse-db-v4-db-1"


docker exec -i "$container" sh -c 'exec mysqldump '$database_name' -uroot -p"$MYSQL_ROOT_PASSWORD" -R -E' > "$output_file"

echo "Dump complete to \"$output_file\""
