# Distributed Fault-Tolerant Online Enrollment System

## Prerequisites

1.  **Windows PC**:
    * **MySQL** installed.
2.  **Linux Virtual Machine (VM)**:
    * **Docker** installed.

## Build and Compilation Steps

1. Download the repository
2. Open **MySQL Workbench** and execute the initial setup portion of `script.sql` (up to the point of creating the database schema and the dedicated user account for the application).
3. Edit `docker-compose.yml`
    * The IP of the MySQL database points to the Windows host machine.
    * Each node should be assigned a unique IP address.
4. Copy the repository to the VM
5. Build and start the Docker containers on the VM directory.
6. Open a web browser and navigate to the IP address and port of your GUI Node (e.g., `http://<GUI_NODE_IP>:<PORT>`)
7. Register 4 accounts in the following order:
    * 2 Student Accounts: `firstname_lastname@dlsu.edu.ph`
    * 2 Faculty Accounts: `firstname.lastname@dlsu.edu.ph`
8. Execute the remaining part of `script.sql` which assigns courses to the accounts.