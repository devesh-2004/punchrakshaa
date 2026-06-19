import { getShiprocketToken } from "./auth";

export class ShiprocketService {
  private static baseUrl = 'https://apiv2.shiprocket.in/v1/external';

  /**
   * Create Adhoc Order in Shiprocket
   */
  static async createAdhocOrder(payload: Record<string, unknown>) {
    const token = await getShiprocketToken();
    
    const response = await fetch(`${this.baseUrl}/orders/create/adhoc`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Shiprocket Create Order Error:", data);
      throw new Error(`Shiprocket order creation failed: ${JSON.stringify(data.errors || data.message)}`);
    }

    return data;
  }

  /**
   * Assign AWB to a Shipment
   */
  static async assignAWB(shipmentId: number, courierId?: number) {
    const token = await getShiprocketToken();

    const response = await fetch(`${this.baseUrl}/courier/assign/awb`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        shipment_id: shipmentId,
        courier_id: courierId,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Failed to assign AWB: ${data.message || response.statusText}`);
    }

    return data;
  }

  /**
   * Generate Pickup for a Shipment
   */
  static async generatePickup(shipmentIds: number[]) {
    const token = await getShiprocketToken();

    const response = await fetch(`${this.baseUrl}/courier/generate/pickup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        shipment_id: shipmentIds,
      }),
    });

    return await response.json();
  }

  /**
   * Track Shipment by AWB
   */
  static async trackShipment(awbCode: string) {
    const token = await getShiprocketToken();

    const response = await fetch(`${this.baseUrl}/courier/track/awb/${awbCode}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return await response.json();
  }

  /**
   * Print Invoice
   */
  static async printInvoice(orderIds: number[]) {
    const token = await getShiprocketToken();

    const response = await fetch(`${this.baseUrl}/orders/print/invoice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ids: orderIds }),
    });

    return await response.json();
  }
}
