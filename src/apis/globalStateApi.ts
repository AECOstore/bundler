import * as piral_utils from 'piral-core/esm/utils/'
import { PiralPlugin, PiletApi } from 'piral'
import * as React from 'react';

declare module 'piral-core/lib/types/custom' {
  interface PiletCustomApi extends StateMappingApi { }
}

interface StateMappingApi {
  setDataGlobal(name: string, value: any, options: any): boolean,
  makeState(app: PiletApi, constants: any)
  withState(App: any, options: any)
}

function withState(App, {app, state, actions}) {
  const {setState} = actions
  const constants = app.getData('CONSTANTS')

  app.on('store-data', ({ name, value }) => {
    for (const [constant, v] of Object.entries(constants)) {
      if (name == v) {
        setState(v, value)
      }
    }
  });

  return App({piral: app, state})
}

function setData(name, value, context, options?) {
  const { target = 'memory', expires } = Object(piral_utils["createDataOptions"])(options);
  const expiration = Object(piral_utils["getDataExpiration"])(expires);
  return context.tryWriteDataItem(name, value, "global", target, expiration);
}

export function createStateApi(): PiralPlugin<StateMappingApi> {
  return context => () => ({
    setDataGlobal(name, value, options?) {
      return setData(name, value, context, options)
    },
    makeState,
    withState
  })
}

const makeState = (app: PiletApi) => {
  const constants = app.getData('CONSTANTS')
  const s = {
    state: {},
    actions: {
      setState(dispatch, key, value) {
        dispatch(state => ({
          [key]: value
        }))
      }
    }
  }

  for (const [key, value] of Object.entries(constants)) {
    const url: any = value
    s.state[url] = app.getData(url)
  }
  return app.createState(s)
}





// const mapGlobalState = ({ name, value }, mapping) => {
//   for (const [key, v] of Object.entries(mapping)) {
//     if (name.includes(key)) {
//       const setter = v["onEvent"]
//       setter(value)
//     }
//   }
// }

// const mappingFactory = (mapping, piral) => {
//   const final = {}
//   for (const [key, value] of Object.entries(mapping)) {
//     final[key] = {
//       onEvent: value,
//       set(value) {
//         const k = key + "_&&_" + piral.meta.basePath
//         return piral.setData(k, value)
//       }
//     }
//   }
//   return final
// }

