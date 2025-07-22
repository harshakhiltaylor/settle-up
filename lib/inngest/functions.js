import { inngest } from "./client"

export const helloWorld = inngest.createFunction({id: "hello-world"} , 
    {event: "test/hello-world"},

    async ({event , step }) =>{
        await step.sleep("wait-a-momemt" , "1s");
        return {message: `hello ${event.data.email}`};
    }
);

