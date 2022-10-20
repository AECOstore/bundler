import * as piral from 'piral-core'
import { PiralPlugin, PiletApi } from 'piral'
import * as React from 'react';
import constants from '../constants'
import Cookies from 'universal-cookie';
import jwt_decode from 'jwt-decode'
import {QueryEngine} from '@comunica/query-sparql'
const cookies = new Cookies()


declare module 'piral-core/lib/types/custom' {
  interface PiletCustomApi extends AecoStoreApi { }
}

interface AecoStoreApi {
  setDataGlobal(name: string, value: any, options: any): boolean,
  makeState(app: PiletApi, constants: any)
  withState(App: any, options: any)
  getChildModules(app: PiletApi)
  authFetch(input: any, token: string, init?: any)
  makeSession(),
  findSparqlSatellite(webId: string)
}

export function createAecoStoreApi(): PiralPlugin<AecoStoreApi> {
  return context => () => ({
    setDataGlobal(name, value, options?) {
      return setData(name, value, context, options)
    },
    makeState,
    withState,
    getChildModules,
    authFetch,
    makeSession,
    findSparqlSatellite
  })
}

function withState(App, { app, state, actions }) {
  const { setState } = actions
  const constants = app.getData('CONSTANTS')

  app.on('store-data', ({ name, value }) => {
    for (const [constant, v] of Object.entries(constants)) {
      if (name == v) {
        setState(v, value)
      }
    }
  });

  return App({ piral: app, state })
}

function setData(name, value, context, options?) {
  const { target = 'memory', expires } = Object(piral["createDataOptions"])(options);
  const expiration = Object(piral["getDataExpiration"])(expires);
  return context.tryWriteDataItem(name, value, "global", target, expiration);
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

async function findSparqlSatellite(webId) {
  const query = `SELECT ?sat where {<${webId}> <https://w3id.org/consolid#hasSparqlSatellite> ?sat}`
  const myEngine = new QueryEngine()
  const bindings = await myEngine.queryBindings(query, {sources: [webId]})
  const results = await bindings.toArray()
  if (results.length) {
      return results[0].get('sat').value
  }
}

function makeSession() {
  let token = cookies.get(constants.ACCESS_TOKEN)
  if (token) {
    const decoded = jwt_decode<any>(token)
    const webId = decoded.webid

    return {
      fetch: authFetch,
      info: {
        webId,
        isLoggedIn: true
      }
    }
  } else {
      return {
        fetch, 
        info: {
          isLoggedIn: false
        }
      }
    }

}

async function authFetch(input, init?) {
  let token = cookies.get(constants.ACCESS_TOKEN)
  let options: any = {}
  if (init) {
    options = init
  }
  if (token) {
    if (options.headers) {
      options.headers["Authorization"] = `Bearer ${token}`
    } else {
      options.headers = { "Authorization": `Bearer ${token}` }
    }
  }
  return await fetch(input, options)
}

function getChildModules(piral: PiletApi) {
  const modules = piral.getData("CONFIGURATION").items
  const childrenLinks = piral.meta["hosts"] || []

  return modules.filter((item) => {
    return childrenLinks.includes(item["@id"])
  })
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

