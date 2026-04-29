import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { action, query, data, itemCategories } = body

    const TENANT_ID = '4af316b5-92f0-4e36-9242-99fd5953ae01'
    const CLIENT_ID = '9576ef70-1591-4197-b739-0a4506082ec3'
    const CLIENT_SECRET = Deno.env.get('BC_CLIENT_SECRET') || ''
    const ENVIRONMENT = 'Production'
    const COMPANY_ID = '0df38c70-9787-f011-b419-002248def943'

    const tokenUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`
    const tokenParams = new URLSearchParams()
    tokenParams.append('grant_type', 'client_credentials')
    tokenParams.append('client_id', CLIENT_ID)
    tokenParams.append('client_secret', CLIENT_SECRET)
    tokenParams.append('scope', 'https://api.businesscentral.dynamics.com/.default')

    const tokenRes = await fetch(tokenUrl, { method: 'POST', body: tokenParams })
    if (!tokenRes.ok) throw new Error('Failed to obtain access token')
    const { access_token } = await tokenRes.json()

    const apiBase = `https://api.businesscentral.dynamics.com/v2.0/${TENANT_ID}/${ENVIRONMENT}/api/v2.0/companies(${COMPANY_ID})`
    const odataBase = `https://api.businesscentral.dynamics.com/v2.0/${TENANT_ID}/${ENVIRONMENT}/ODataV4/Company('GROSSO%20TRACTORES%20S.A')`
    const headers = { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' }

    // --- SEARCH_VENDORS ---
    if (action === 'SEARCH_VENDORS') {
      const { cuit, vendorNumber } = data

      // Search by vendor number (used for CONSUMIDOR FINAL → Grosso Tractores)
      if (vendorNumber) {
        const url = `${apiBase}/vendors?$filter=number eq '${vendorNumber}'&$select=id,number,displayName,taxRegistrationNumber,city`
        const res = await fetch(url, { headers })
        if (!res.ok) throw new Error('Search Vendor by Number Error: ' + (await res.text()))
        const result = await res.json()
        const vendors = result.value || []
        return new Response(JSON.stringify({
          success: true,
          found: vendors.length > 0,
          vendors: vendors.map((v: any) => ({
            id: v.id,
            number: v.number,
            displayName: v.displayName,
            taxRegistrationNumber: v.taxRegistrationNumber || '',
            city: v.city || ''
          }))
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Search by CUIT (standard flow)
      if (!cuit) throw new Error('Missing cuit or vendorNumber')
      // Use OData Vendor_Card which allows filtering on VAT_Registration_No (CUIT/CIF/NIF)
      const url = `${odataBase}/Vendor_Card?$filter=VAT_Registration_No eq '${cuit}'&$select=No,Name,VAT_Registration_No,City,County`
      const res = await fetch(url, { headers })
      if (!res.ok) {
        // Fallback: fetch all vendors and filter client-side
        const allUrl = `${apiBase}/vendors?$select=id,number,displayName,taxRegistrationNumber,city`
        const allRes = await fetch(allUrl, { headers })
        if (!allRes.ok) throw new Error('Search Vendors Error: ' + (await allRes.text()))
        const allResult = await allRes.json()
        const filtered = (allResult.value || []).filter((v: any) => v.taxRegistrationNumber === cuit)
        return new Response(JSON.stringify({
          success: true,
          found: filtered.length > 0,
          vendors: filtered.map((v: any) => ({
            id: v.id,
            number: v.number,
            displayName: v.displayName,
            taxRegistrationNumber: v.taxRegistrationNumber || '',
            city: v.city || ''
          }))
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const result = await res.json()
      const vendors = result.value || []
      return new Response(JSON.stringify({
        success: true,
        found: vendors.length > 0,
        vendors: vendors.map((v: any) => ({
          id: '',
          number: v.No || '',
          displayName: v.Name || '',
          taxRegistrationNumber: v.VAT_Registration_No || '',
          city: v.City || '',
          county: v.County || ''
        }))
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // --- LIST_PURCHASE_INVOICES ---
    if (action === 'LIST_PURCHASE_INVOICES') {
      const { vendorNumber, number: invNum } = data || {}
      let filter = ''
      if (invNum) filter = `number eq '${invNum}'`
      else if (vendorNumber) filter = `vendorNumber eq '${vendorNumber}'`
      const url = `${apiBase}/purchaseInvoices${filter ? '?$filter=' + filter : ''}${'&$top=20&$orderby=invoiceDate desc'}`
      const res = await fetch(url.replace('$&', '?'), { headers })
      if (!res.ok) throw new Error(await res.text())
      const result = await res.json()
      return new Response(JSON.stringify({ success: true, invoices: result.value || [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // --- DELETE_PURCHASE_INVOICE ---
    if (action === 'DELETE_PURCHASE_INVOICE') {
      const { invoiceId } = data
      if (!invoiceId) throw new Error('Missing invoiceId')
      // Get etag first
      const getRes = await fetch(`${apiBase}/purchaseInvoices(${invoiceId})`, { headers })
      if (!getRes.ok) throw new Error('GET Error: ' + (await getRes.text()))
      const inv = await getRes.json()
      const etag = inv['@odata.etag']
      const delRes = await fetch(`${apiBase}/purchaseInvoices(${invoiceId})`, {
        method: 'DELETE', headers: { ...headers, 'If-Match': etag }
      })
      if (!delRes.ok) throw new Error('DELETE Error: ' + (await delRes.text()))
      return new Response(JSON.stringify({ success: true, deleted: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // --- CREATE_PURCHASE_INVOICE ---
    if (action === 'CREATE_PURCHASE_INVOICE') {
      const { header, lines } = data
      if (!header || !lines) throw new Error('Missing header or lines')
      const invoicesUrl = `${apiBase}/purchaseInvoices`
      const headerRes = await fetch(invoicesUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(header)
      })
      if (!headerRes.ok) throw new Error('BC Header Error: ' + (await headerRes.text()))
      const createdInvoice = await headerRes.json()
      const docNo = createdInvoice.number || ''
      const createdLines: any[] = []
      const odataWarnings: any[] = [] // <--- ADDED FOR DEBUGGING
      
      if (lines.length > 0) {
        const linesUrl = `${invoicesUrl}(${createdInvoice.id})/purchaseInvoiceLines`
        for (const line of lines) {
          // Step 1: Create line with API v2.0 (basic fields)
          const { vatGroup, sucursal, areaDim, taxAreaCode, ...apiFields } = line
          const lineRes = await fetch(linesUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(apiFields)
          })
          if (!lineRes.ok) throw new Error('BC Line Error: ' + (await lineRes.text()))
          const createdLine = await lineRes.json()
          createdLines.push(createdLine)

          // Step 2: PATCH via OData to set fields not available in API v2.0
          // (VAT_Prod_Posting_Group, Shortcut_Dimension_1_Code, Shortcut_Dimension_2_Code, Tax_Area_Code)
          const lineNo = createdLine.sequence // API v2.0 returns 'sequence' as the line number
          if (docNo && lineNo && (vatGroup || sucursal || areaDim || taxAreaCode)) {
            const patchFields: Record<string, any> = {}
            if (vatGroup) patchFields['VAT_Prod_Posting_Group'] = vatGroup
            if (sucursal) patchFields['Shortcut_Dimension_1_Code'] = sucursal
            // Shortcut_Dimension_2_Code is CANAL, not AREA. Do not send areaDim here.
            if (taxAreaCode) patchFields['Tax_Area_Code'] = taxAreaCode

            const odataLineUrl = `${odataBase}/Purchase_Invoice_Line(Document_Type='Invoice',Document_No='${encodeURIComponent(docNo)}',Line_No=${lineNo})`
            // Get ETag first
            const getLineRes = await fetch(odataLineUrl, { headers })
            if (getLineRes.ok) {
              const lineData = await getLineRes.json()
              const etag = lineData['@odata.etag']
              const patchRes = await fetch(odataLineUrl, {
                method: 'PATCH',
                headers: { ...headers, 'If-Match': etag },
                body: JSON.stringify(patchFields)
              })
              if (!patchRes.ok) {
                const errText = await patchRes.text()
                console.error('OData PATCH warning (non-fatal):', errText)
                odataWarnings.push({ lineNo, type: 'PATCH', error: errText, url: odataLineUrl, payload: patchFields })
              }
            } else {
              const errText = await getLineRes.text()
              console.error('OData GET line warning:', errText)
              odataWarnings.push({ lineNo, type: 'GET', error: errText, url: odataLineUrl })
            }
          }
        }
      }
      return new Response(JSON.stringify({
        success: true,
        invoice: createdInvoice,
        invoiceNumber: docNo,
        invoiceId: createdInvoice.id || '',
        lines: createdLines,
        odataWarnings // <--- ADDED TO RESPONSE
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // --- FETCH_SALESPERSONS ---
    if (action === 'FETCH_SALESPERSONS') {
      const url = `${odataBase}/Salesperson_Purchaser?$filter=startswith(Code,'VEND-')&$select=Code,Name,Phone_No`
      const res = await fetch(url, { headers })
      if (!res.ok) throw new Error('Fetch Salespersons Error: ' + (await res.text()))
      const result = await res.json()
      const salespersons = (result.value || []).map((sp: any) => ({
        code: sp.Code, name: sp.Name, phone: sp.Phone_No || ''
      }))
      return new Response(JSON.stringify({ success: true, salespersons }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // --- CHECK_CUSTOMER_EXISTS ---
    if (action === 'CHECK_CUSTOMER_EXISTS') {
      const { customer_number, customer_name } = data
      let url = ''
      if (customer_number) {
        url = `${apiBase}/customers?$filter=number eq '${customer_number}'`
      } else if (customer_name) {
        url = `${apiBase}/customers?$filter=contains(displayName,'${encodeURIComponent(customer_name)}')&$top=5`
      } else {
        throw new Error('Missing customer_number or customer_name')
      }
      const res = await fetch(url, { headers })
      if (!res.ok) throw new Error('Check Customer Error: ' + (await res.text()))
      const result = await res.json()
      const customers = result.value || []
      return new Response(JSON.stringify({
        success: true,
        exists: customers.length > 0,
        customers: customers.map((c: any) => ({
          id: c.id, number: c.number, displayName: c.displayName,
          email: c.email || '', phoneNumber: c.phoneNumber || '',
          taxRegistrationNumber: c.taxRegistrationNumber || ''
        }))
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // --- SYNC_MACHINE ---
    if (action === 'SYNC_MACHINE') {
      const svcUrl = `${odataBase}/ServiceItemCard`
      const { nro_producto, descripcion, nro_serie, horas_uso, cod_grupo, cliente_bc_id } = data
      const isNew = !nro_producto || String(nro_producto).startsWith('TEMP-')
      if (isNew) {
        const payload = { Description: descripcion || '', Serial_No: nro_serie || '', GTc_Horas_maquina: Number(horas_uso) || 0, Service_Item_Group_Code: cod_grupo || '', Customer_No: cliente_bc_id || '' }
        const res = await fetch(svcUrl, { method: 'POST', headers, body: JSON.stringify(payload) })
        if (!res.ok) throw new Error('POST Error: ' + (await res.text()))
        return new Response(JSON.stringify({ success: true, data: await res.json() }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      } else {
        const getUrl = `${svcUrl}('${nro_producto}')`
        const getRes = await fetch(getUrl, { headers })
        if (!getRes.ok) throw new Error('GET Error: ' + (await getRes.text()))
        const currentData = await getRes.json()
        const etag = currentData['@odata.etag']
        const patchPayload = { Description: descripcion || '', Serial_No: nro_serie || '', GTc_Horas_maquina: Number(horas_uso) || 0 }
        const patchRes = await fetch(getUrl, { method: 'PATCH', headers: { ...headers, 'If-Match': etag }, body: JSON.stringify(patchPayload) })
        if (!patchRes.ok) throw new Error('PATCH Error: ' + (await patchRes.text()))
        return new Response(JSON.stringify({ success: true, data: await patchRes.json() }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // --- CREATE_SALES_ORDER ---
    if (action === 'CREATE_SALES_ORDER') {
      const ordersUrl = `${apiBase}/salesOrders`
      const { header, lines } = data
      const headerRes = await fetch(ordersUrl, { method: 'POST', headers, body: JSON.stringify(header) })
      if (!headerRes.ok) throw new Error('BC Header POST Error: ' + (await headerRes.text()))
      const createdOrder = await headerRes.json()
      const createdLines: any[] = []
      if (lines && lines.length > 0) {
        const linesUrl = `${ordersUrl}(${createdOrder.id})/salesOrderLines`
        for (const line of lines) {
          const lineRes = await fetch(linesUrl, { method: 'POST', headers, body: JSON.stringify(line) })
          if (!lineRes.ok) throw new Error('BC Line POST Error: ' + (await lineRes.text()))
          createdLines.push(await lineRes.json())
        }
      }
      return new Response(JSON.stringify({ success: true, order: createdOrder, lines: createdLines }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // --- SYNC_CLIENT_TELEMETRY ---
    if (action === 'SYNC_CLIENT_TELEMETRY') {
      const { bc_id } = data
      if (!bc_id) throw new Error('Missing bc_id')
      const [finRes, invRes, servRes, machRes, catRes] = await Promise.all([
        fetch(`${apiBase}/customerFinancialDetails?$filter=number eq '${bc_id}'`, { headers }).then(r => r.ok ? r.json() : { value: [] }),
        fetch(`${apiBase}/salesInvoices?$filter=customerNumber eq '${bc_id}'&$top=20&$orderby=postingDate desc&$expand=salesInvoiceLines`, { headers }).then(r => r.ok ? r.json() : { value: [] }),
        fetch(`${odataBase}/Pedido_servicio_Excel?$filter=Customer_No eq '${bc_id}'&$top=20&$orderby=Order_Date desc`, { headers }).then(r => r.ok ? r.json() : { value: [] }).catch(() => ({ value: [] })),
        fetch(`${odataBase}/ServiceItemCard?$filter=Customer_No eq '${bc_id}'`, { headers }).then(r => r.ok ? r.json() : { value: [] }),
        fetch(`${odataBase}/Customer_Card('${bc_id}')?$select=No,GTc_Customer_Category,GTc_Comportamiento_Pago`, { headers }).then(r => r.ok ? r.json() : null).catch(() => null)
      ])
      return new Response(JSON.stringify({
        success: true,
        financials: finRes.value && finRes.value.length > 0 ? finRes.value[0] : null,
        invoices: invRes.value || [],
        serviceOrders: servRes.value || [],
        machinery: machRes.value || [],
        categoria: catRes ? (catRes.GTc_Customer_Category || null) : null,
        comportamiento_pago: catRes ? (catRes.GTc_Comportamiento_Pago || null) : null
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // --- FETCH_CLIENT_CONTACTS ---
    if (action === 'FETCH_CLIENT_CONTACTS') {
      const { company_name } = data
      if (!company_name) throw new Error('Missing company_name')
      const encodedName = company_name.replace(/'/g, "''")
      const url = `${apiBase}/contacts?$filter=companyName eq '${encodedName}'`
      const res = await fetch(url, { headers })
      if (!res.ok) throw new Error('Fetch Contacts Error: ' + (await res.text()))
      const result = await res.json()
      return new Response(JSON.stringify({ success: true, contacts: result.value || [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // --- CREATE_CONTACT ---
    if (action === 'CREATE_CONTACT') {
      const { displayName, phoneNumber, email, jobTitle, companyName } = data
      if (!displayName) throw new Error('Missing displayName')
      const payload: Record<string, string> = {
        displayName, type: "Person", companyName: companyName || ""
      }
      if (phoneNumber) { payload.phoneNumber = phoneNumber; payload.mobilePhoneNumber = phoneNumber }
      if (email) payload.email = email
      if (jobTitle) payload.jobTitle = jobTitle
      const res = await fetch(`${apiBase}/contacts`, {
        method: 'POST', headers, body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Create Contact Error: ' + (await res.text()))
      const created = await res.json()
      return new Response(JSON.stringify({ success: true, contact: created }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // --- FETCH_BC_USERS ---
    if (action === 'FETCH_BC_USERS') {
      const url = `${odataBase}/User_Setup?$select=User_ID,Salespers_Purch_Code&$top=200`
      const res = await fetch(url, { headers })
      if (!res.ok) {
        // Fallback: try API v2.0 users endpoint
        const fallbackUrl = `${apiBase}/users?$select=userName,displayName&$top=200`
        const fallbackRes = await fetch(fallbackUrl, { headers })
        if (!fallbackRes.ok) throw new Error('Fetch BC Users Error: ' + (await fallbackRes.text()))
        const fallbackResult = await fallbackRes.json()
        const users = (fallbackResult.value || []).map((u: any) => ({
          userId: u.userName || '',
          displayName: u.displayName || '',
          purchaserCode: ''
        }))
        return new Response(JSON.stringify({ success: true, users }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const result = await res.json()
      const users = (result.value || []).map((u: any) => ({
        userId: u.User_ID || '',
        purchaserCode: u.Salespers_Purch_Code || ''
      }))
      return new Response(JSON.stringify({ success: true, users }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // --- searchCustomers / searchItems ---
    const toTitleCase = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
    let variations = [query]
    if (query) {
      variations = [...new Set([query.toLowerCase(), query.toUpperCase(), toTitleCase(query)])]
    }
    const requests = variations.map(q => {
      const encodedQ = encodeURIComponent(q)
      if (action === 'searchCustomers') {
        const url = `${apiBase}/customers?$top=10&$filter=contains(displayName,'${encodedQ}')`
        return fetch(url, { headers })
          .then(r => r.ok ? r.json() : { value: [] }).catch(() => ({ value: [] }))
      } else {
        let filter = `contains(displayName,'${encodedQ}')`
        if (itemCategories && Array.isArray(itemCategories) && itemCategories.length > 0) {
          const catFilters = itemCategories.map((cat: string) => `itemCategoryCode eq '${cat}'`).join(' or ')
          filter = `(${filter}) and (${catFilters})`
        }
        const url = `${apiBase}/items?$top=10&$filter=${encodeURIComponent(filter)}`
        return fetch(url, { headers })
          .then(r => r.ok ? r.json() : { value: [] }).catch(() => ({ value: [] }))
      }
    })
    const results = await Promise.all(requests)
    const allItems = results.flatMap(r => r.value || [])
    const uniqueItems = Array.from(new Map(allItems.map(item => [item.id, item])).values())
    return new Response(JSON.stringify({ value: uniqueItems.slice(0, 20) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message || 'Unknown error', stack: error.stack }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
  }
})
