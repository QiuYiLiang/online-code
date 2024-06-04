import * as vueCompiler from "@vue/compiler-sfc";
import { keys, values } from "lodash-es";
import { createElement, useEffect, useRef } from "react";
import * as React from "react";
import { createRoot } from "react-dom/client";
import * as Vue from "vue";

const ReactComponent = {
  props: ['code'],
  setup(props) {
    const divRef = Vue.ref(null)
    Vue.onMounted(async () => {
      const Component = await getReactComponent(props.code)
      createRoot(divRef.value).render(createElement(Component))
    })

    return () => Vue.h('div', {ref: divRef})
  }
}

async function runCode(code: string, context: Record<string, any>) {
  const outCode = `async () => {${code}}`;

  return await createFunction(outCode, context)();
}

function createFunction(functionCode: string, context: Record<string, any>) {
  const contextArgNames = keys(context);
  const contextArgs = values(context);
  const createFunction = new Function(
    ...contextArgNames,
    `
      return ${functionCode}
    `
  );
  return createFunction.apply(null, contextArgs);
}

async function getVueComponent(code: string) {
  const data = vueCompiler.parse(code).descriptor;
  const script = vueCompiler.compileScript(data, {
    id: "__VueComponentScript__",
    genDefaultAs: "__VueComponentScript__",
  }).content;
  const template = vueCompiler.compileTemplate({
    id: "hhh",
    source: data.template?.content,
    compilerOptions: {
      mode: "function",
    },
  }).code;
  const Component = await runCode(`${script};return __VueComponentScript__`, {
    Vue,
    ...Vue,
  });
  const newVue = {
    ...Vue,
    resolveComponent: (ComponentName) => {
      return {
        ReactComponent
      }[ComponentName]
    }
  }
  Component.render = await runCode(template, {
    Vue: newVue,
    ...newVue,
  });
  return Component;
}

async function getReactComponent(code: string) {
  const outCode = (window as any).Babel.transform(
    `(async () => {
      ${code}
    })()`,
    {
      presets: ['react'],
    }
  ).code
  const context = {
    React,
    ...React,
  }
  delete context.default
  const Component = await runCode(`return await ${outCode}`, context);
  return Component
}

const VueComponent = ({ code }: {code:string}) => {

  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    getVueComponent(code).then((Component) => {
      Vue.createApp(Component).mount(ref.current as HTMLElement);
    });
  });

  return <div ref={ref}><div></div></div>;
};


const codeStore = {
  comp1:`
      <script setup>
      const msg = ref('hi')
      </script>

      <template>
        <h1>{{ msg }}</h1>
        <input v-model="msg">
      </template>
    `,
  comp2: `
      return () => {
        return <button>hhhhhhh</button>
      }
    `
}

function App() {
  return <VueComponent code={`
    <script setup>
    const msg = ref('hi')
    </script>

    <template>
      <h1>{{ msg }}</h1>
      <input v-model="msg">
      <ReactComponent :code="\`${codeStore.comp2}\`" />
    </template>
  `} />;
}

export default App;
