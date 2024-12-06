# @dao-dao/tests

DAO DAO Tests

## Setup

1. Install Docker Desktop: https://www.docker.com/products/docker-desktop/

2. Install and turn on Kubernetes in Docker Desktop: https://docs.docker.com/desktop/features/kubernetes/#install-and-turn-on-kubernetes

3. Set up Starship:

```bash
yarn starship:setup
yarn starship:start
```

4. Install contracts on Starship chain with the CLI in the
   [`dispatch`](../dispatch/) package:

```bash
cd ../dispatch && yarn deploy -v VERSION -c juno --starship
```

5. Run the tests:

```bash
yarn test:starship
```

Sometimes port forwarding doesn't work, and you have to manually run the port
forward command again once the servers are running:

```bash
yarn starship:start-ports
```
