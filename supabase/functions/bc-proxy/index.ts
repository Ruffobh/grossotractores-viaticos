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

    // --- DIAGNOSTIC_GET ---
    if (action === 'DIAGNOSTIC_GET') {
      const { endpoint, type } = data
      const url = type === 'ODATA' ? `${odataBase}/${endpoint}` : `${apiBase}/${endpoint}`
      const res = await fetch(url, { headers })
      if (!res.ok) throw new Error(`DIAGNOSTIC_GET Error: ${res.status} - ${await res.text()}`)
      const result = await res.json()
      return new Response(JSON.stringify({ success: true, result }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

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

      // Normalize CUIT: generate both formats (with and without dashes)
      const cuitNoDashes = cuit.replace(/[-\s]/g, '')
      const cuitWithDashes = cuitNoDashes.length === 11
        ? `${cuitNoDashes.slice(0,2)}-${cuitNoDashes.slice(2,10)}-${cuitNoDashes.slice(10)}`
        : cuit
      // Build list of unique CUIT variants to try
      const cuitVariants = [...new Set([cuit, cuitNoDashes, cuitWithDashes])]

      // Use OData Vendor_Card which allows filtering on VAT_Registration_No (CUIT/CIF/NIF)
      // Try each CUIT variant until one returns results
      let vendors: any[] = []
      let odataSuccess = false
      for (const variant of cuitVariants) {
        const url = `${odataBase}/Vendor_Card?$filter=VAT_Registration_No eq '${variant}'&$select=No,Name,VAT_Registration_No,City,County`
        const res = await fetch(url, { headers })
        if (res.ok) {
          odataSuccess = true
          const result = await res.json()
          vendors = result.value || []
          if (vendors.length > 0) break // Found with this variant, stop trying
        }
      }

      if (!odataSuccess || vendors.length === 0) {
        // Fallback: fetch all vendors and filter client-side (normalize both sides)
        const allUrl = `${apiBase}/vendors?$select=id,number,displayName,taxRegistrationNumber,city`
        const allRes = await fetch(allUrl, { headers })
        if (!allRes.ok) throw new Error('Search Vendors Error: ' + (await allRes.text()))
        const allResult = await allRes.json()
        const filtered = (allResult.value || []).filter((v: any) => {
          const bcCuit = (v.taxRegistrationNumber || '').replace(/[-\s]/g, '')
          return bcCuit === cuitNoDashes
        })
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

    // --- CHECK_INVOICE_STATUS ---
    if (action === 'CHECK_INVOICE_STATUS') {
      const { invoiceNo } = data
      if (!invoiceNo) throw new Error('Missing invoiceNo')
      const url = `${apiBase}/purchaseInvoices?$filter=number eq '${encodeURIComponent(invoiceNo)}'&$select=id`
      const res = await fetch(url, { headers })
      if (!res.ok) throw new Error('Check Invoice Error: ' + (await res.text()))
      const result = await res.json()
      const draftExists = result.value && result.value.length > 0
      return new Response(JSON.stringify({ success: true, posted: !draftExists }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
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
      
      // Strip sucursal (Shortcut_Dimension_1_Code) before posting to API v2.0
      const { sucursal, ...apiHeader } = header

      const invoicesUrl = `${apiBase}/purchaseInvoices`
      const headerRes = await fetch(invoicesUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(apiHeader)
      })
      if (!headerRes.ok) throw new Error('BC Header Error: ' + (await headerRes.text()))
      const createdInvoice = await headerRes.json()
      const docNo = createdInvoice.number || ''
      const createdLines: any[] = []
      const odataWarnings: any[] = [] // <--- ADDED FOR DEBUGGING

      // Get VOXI_Behavior_Code from Header dynamically first
      let behaviorCode = ''
      const debugLog: string[] = []
      if (docNo) {
        debugLog.push(`Processing invoice header for document number: ${docNo}`)
        try {
          const headerOdataUrl = `${odataBase}/Purchase_Invoice_Header(Document_Type='Invoice',No='${encodeURIComponent(docNo)}')`
          debugLog.push(`GET Header OData URL (Initial): ${headerOdataUrl}`)
          const headerOdataRes = await fetch(headerOdataUrl, { headers })
          if (headerOdataRes.ok) {
            const headerOdata = await headerOdataRes.json()
            behaviorCode = headerOdata.VOXI_Behavior_Code || ''
            debugLog.push(`Initially obtained VOXI_Behavior_Code from header: "${behaviorCode}"`)
          } else {
            const errText = await headerOdataRes.text()
            debugLog.push(`Failed to GET Purchase_Invoice_Header initially. Status: ${headerOdataRes.status}, Error: ${errText}`)
          }
        } catch (err: any) {
          debugLog.push(`Error handling initial header behavior code: ${err.message || err}`)
        }
      }

      // If empty, force fallback 'PRODUCTO'
      if (!behaviorCode) {
        debugLog.push(`Header behavior code was empty. Using fallback: "PRODUCTO"`)
        behaviorCode = 'PRODUCTO'
      }
      
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
          // (VAT_Prod_Posting_Group, Shortcut_Dimension_1_Code, Shortcut_Dimension_2_Code, Tax_Area_Code, VOXI_Behavior_Code)
          const lineNo = createdLine.sequence // API v2.0 returns 'sequence' as the line number
          debugLog.push(`Processing line no ${lineNo} (sequence) for extra fields. behaviorCode is "${behaviorCode}"`)
          if (docNo && lineNo && (vatGroup || sucursal || areaDim || taxAreaCode || behaviorCode)) {
            const patchFields: Record<string, any> = {}
            if (vatGroup) patchFields['VAT_Prod_Posting_Group'] = vatGroup
            if (sucursal) patchFields['Shortcut_Dimension_1_Code'] = sucursal
            // Shortcut_Dimension_2_Code is CANAL, not AREA. Do not send areaDim here.
            if (taxAreaCode) patchFields['Tax_Area_Code'] = taxAreaCode
            if (behaviorCode) patchFields['VOXI_Behavior_Code'] = behaviorCode

            const odataLineUrl = `${odataBase}/Purchase_Invoice_Line(Document_Type='Invoice',Document_No='${encodeURIComponent(docNo)}',Line_No=${lineNo})`
            debugLog.push(`GET Line OData URL: ${odataLineUrl}`)
            // Get ETag first
            const getLineRes = await fetch(odataLineUrl, { headers })
            if (getLineRes.ok) {
              const lineData = await getLineRes.json()
              const etag = lineData['@odata.etag']
              debugLog.push(`GET Line OData successful. ETag obtained: ${etag}. Current VOXI_Behavior_Code in line: "${lineData.VOXI_Behavior_Code || ''}"`)
              
              debugLog.push(`PATCH Line OData with fields: ${JSON.stringify(patchFields)}`)
              const patchRes = await fetch(odataLineUrl, {
                method: 'PATCH',
                headers: { ...headers, 'If-Match': etag },
                body: JSON.stringify(patchFields)
              })
              if (patchRes.ok) {
                debugLog.push(`PATCH Line OData successful. Response status: ${patchRes.status}`)
              } else {
                const errText = await patchRes.text()
                debugLog.push(`Failed to PATCH Purchase_Invoice_Line. Status: ${patchRes.status}, Error: ${errText}`)
                odataWarnings.push({ lineNo, type: 'PATCH', error: errText, url: odataLineUrl, payload: patchFields })
              }
            } else {
              const errText = await getLineRes.text()
              debugLog.push(`Failed to GET Purchase_Invoice_Line for ETag. Status: ${getLineRes.status}, Error: ${errText}`)
              odataWarnings.push({ lineNo, type: 'GET', error: errText, url: odataLineUrl })
            }
          }
        }
      }

      // Step 3: PATCH the Header at the very end (after lines exist) to force Business Central
      // to execute the validation trigger and propagate VOXI_Behavior_Code to all lines,
      // and ALSO set Shortcut_Dimension_1_Code (SUC) on the Header to keep dimensions consistent,
      // and set/validate Vendor_Invoice_No via OData to trigger Argentine localization VOXI parsing!
      if (docNo) {
        debugLog.push(`--- FINAL STEP: PROPAGATION OF BEHAVIOR CODE, SUCURSAL, AND VENDOR INVOICE NO TO HEADER ---`)
        try {
          const headerOdataUrl = `${odataBase}/Purchase_Invoice_Header(Document_Type='Invoice',No='${encodeURIComponent(docNo)}')`
          const getHeaderRes = await fetch(headerOdataUrl, { headers })
          if (getHeaderRes.ok) {
            const headerOdata = await getHeaderRes.json()
            const etag = headerOdata['@odata.etag']
            debugLog.push(`GET Header OData successful for final PATCH. ETag: ${etag}`)
            
            const patchHeaderFields: Record<string, any> = {}
            if (behaviorCode) patchHeaderFields['VOXI_Behavior_Code'] = behaviorCode
            if (sucursal) patchHeaderFields['Shortcut_Dimension_1_Code'] = sucursal
            if (header.vendorInvoiceNumber) {
              patchHeaderFields['Vendor_Invoice_No'] = header.vendorInvoiceNumber
            }

            debugLog.push(`PATCH Header OData with fields: ${JSON.stringify(patchHeaderFields)}`)
            const patchHeaderRes = await fetch(headerOdataUrl, {
              method: 'PATCH',
              headers: { ...headers, 'If-Match': etag },
              body: JSON.stringify(patchHeaderFields)
            })
            if (patchHeaderRes.ok) {
              debugLog.push(`Successfully committed final VOXI_Behavior_Code, Sucursal, and Vendor_Invoice_No to Header. Status: ${patchHeaderRes.status}`)
            } else {
              const errText = await patchHeaderRes.text()
              debugLog.push(`Failed final PATCH to Purchase_Invoice_Header. Status: ${patchHeaderRes.status}, Error: ${errText}`)
            }
          } else {
            const errText = await getHeaderRes.text()
            debugLog.push(`Failed final GET Header OData for ETag. Status: ${getHeaderRes.status}, Error: ${errText}`)
          }
        } catch (err: any) {
          debugLog.push(`Error in final header validation/propagation: ${err.message || err}`)
        }
      }

      return new Response(JSON.stringify({
        success: true,
        invoice: createdInvoice,
        invoiceNumber: docNo,
        invoiceId: createdInvoice.id || '',
        lines: createdLines,
        odataWarnings,
        debugLog
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // --- PATCH_INVOICE_HEADER ---
    // Patches VOXI fields on the Purchase Invoice Header via OData
    // Used for CONSUMIDOR FINAL to set fiscal type to 90-NO LIBRO IVA
    if (action === 'PATCH_INVOICE_HEADER') {
      const { invoiceNo, fields } = data
      if (!invoiceNo || !fields) throw new Error('Missing invoiceNo or fields')

      const odataUrl = `${odataBase}/Purchase_Invoice_Header(Document_Type='Invoice',No='${encodeURIComponent(invoiceNo)}')`

      // GET to obtain ETag
      const getRes = await fetch(odataUrl, { headers })
      if (!getRes.ok) throw new Error('GET Purchase_Invoice_Header Error: ' + (await getRes.text()))
      const headerData = await getRes.json()
      const etag = headerData['@odata.etag']

      // PATCH with VOXI fields
      const patchRes = await fetch(odataUrl, {
        method: 'PATCH',
        headers: { ...headers, 'If-Match': etag },
        body: JSON.stringify(fields)
      })
      if (!patchRes.ok) throw new Error('PATCH Purchase_Invoice_Header Error: ' + (await patchRes.text()))
      const patchedData = await patchRes.json()

      return new Response(JSON.stringify({
        success: true,
        patched: true,
        fields: Object.fromEntries(Object.keys(fields).map(k => [k, patchedData[k]]))
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
