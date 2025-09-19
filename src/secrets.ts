import { InfisicalSDK } from "@infisical/sdk";

const client = new InfisicalSDK({
    siteUrl: ""
});

const AUTHENTICATED = false;

const authenticate = async () => {
    if (AUTHENTICATED) {
        return;
    }
    await client.auth().universalAuth.login({
        clientId: "<machine-identity-client-id>",
        clientSecret: "<machine-identity-client-secret>"
    });
};

export const getSecrets = async () => {
    await authenticate();
    await client.secrets().listSecrets({
        environment: "dev", // stg, dev, prod, or custom environment slugs
        projectId: "<your-project-id>"
    });
};
