import * as P from "@shopify/polaris";
import * as React from "react";
import { useLoaderData, useSubmit } from "@remix-run/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
    const { admin, session } = await authenticate.admin(request);
    const url = new URL(request.url);
    const id = Number(url.pathname.replace("/app/product/", ""));

    const metafield_count = await admin.rest.resources.Metafield.count({ session, product_id: id });

    const response = await admin.graphql(
        `query {
            product(id: "gid://shopify/Product/${id}") {
                title
                metafields(first: ${metafield_count.count}) {
                    edges {
                        node {
                            id
                            key
                            namespace
                            type
                            value
                        }
                    }
                }
            }
        }`
    );

    const responseJson = await response.json();

    return responseJson.data.product;
}

export const action = async ({ request }) => {
    const { admin, session } = await authenticate.admin(request);

    const url = new URL(request.url);
    const id = Number(url.pathname.replace("/app/product/", ""));

    const body = await request.formData();

    if (body.get("action") == "create") {
        const metafield = new admin.rest.resources.Metafield({ session });

        metafield.product_id = Number(id);
        metafield.namespace = "custom";
        metafield.key = body.get("key");
        metafield.type = "single_line_text_field";
        metafield.value = body.get("value");

        await metafield.save({
            update: true,
        });

        if (metafield) return true;

    } else {
        
        const metafield = new admin.rest.resources.Metafield({ session });

        metafield.product_id = Number(id);
        metafield.id = Number(body.get("id"));
        metafield.value = body.get("value");

        await metafield.save({
            update: true,
        });

        if (metafield) return true;
    }

    return null;
}

export default function Product() {
    const data = useLoaderData();
    const submit = useSubmit();

    const [key, setKey] = React.useState('');
    const [value, setValue] = React.useState('');
    const [active, setActive] = React.useState(false);
    const handleChange = React.useCallback(() => setActive(!active), [active]);
    const handleChangeKey = React.useCallback((newValue) => setKey(newValue), []);
    const handleChangeValue = React.useCallback((newValue) => setValue(newValue), []);
    const [activeAction, setActiveAction] = React.useState("");
    const [activeMetafield, setActiveMetafield] = React.useState("");

    return (
        <P.Page
            backAction={{ content: 'Go Back', url: '/app' }}
            title={data.title}
            primaryAction={<P.Button variant="primary" onClick={() => {
                handleChange();
                setActiveAction("create");
            }}> Add a new Metafield</P.Button >}
        >
            <P.LegacyCard title="Metafields" sectioned>
                {
                    data.metafields.edges.length == 0 ?
                        <P.Text variant="heading2xl" as="h3">No Metafields found</P.Text> :
                        data.metafields.edges.map((meta, index) => <P.TextField
                            key={index}
                            label={meta.node.key}
                            value={meta.node.value}
                            monospaced
                            autoComplete="off"
                            readOnly
                            connectedRight={<P.Button onClick={() => {
                                handleChange();
                                setActiveAction("update");
                                setActiveMetafield(meta.node.id.replace("gid://shopify/Metafield/", ""));
                            }}>Update</P.Button>}
                        />)
                }

            </P.LegacyCard>
            <P.Frame>
                <P.Modal
                    open={active}
                    onClose={handleChange}
                    title="Add details for creating new Metafield below"
                    primaryAction={{
                        content: 'Add',
                        onAction: handleSubmit,
                    }}
                    secondaryActions={[
                        {
                            content: 'Cancel',
                            onAction: handleChange,
                        },
                    ]}
                >
                    <P.Modal.Section>
                        <P.TextContainer>
                            <P.TextField
                                label="Metafield Key"
                                value={key}
                                onChange={handleChangeKey}
                                autoComplete="off"
                            />
                            <P.TextField
                                label="Metafield Value"
                                value={value}
                                onChange={handleChangeValue}
                                autoComplete="off"
                            />
                        </P.TextContainer>
                    </P.Modal.Section>
                </P.Modal>
            </P.Frame>
        </P.Page >
    )

    async function handleSubmit() {
        submit({ key, value, action: activeAction, id: activeMetafield }, { replace: true, method: "POST" });
        setActive(false);
    }
}