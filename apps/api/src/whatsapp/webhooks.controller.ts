import { Inject, Controller,
  Get,
  Post,
  Query,
  Body,
  Headers,
  Res,
  ForbiddenException,
  HttpCode, } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../common/auth.guard';
import { WhatsappService } from './whatsapp.service';
import { ResponsesService } from '../responses/responses.service';

@ApiTags('Meta WhatsApp Webhooks')
@Controller('webhooks/whatsapp')
export class WhatsappWebhooksController {
  constructor(
    @Inject(WhatsappService) private readonly whatsappService: WhatsappService,
    @Inject(ResponsesService) private readonly responsesService: ResponsesService
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Meta WhatsApp Cloud API webhook verification endpoint (hub.challenge)' })
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: any
  ) {
    const expectedToken = process.env.META_VERIFY_TOKEN || 'anhvl-meta-webhook-verify-token';
    if (mode === 'subscribe' && verifyToken === expectedToken) {
      return res.status(200).send(challenge);
    }
    throw new ForbiddenException('Webhook verification token mismatch.');
  }

  @Public()
  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive Meta WhatsApp status receipts (sent/delivered/read/failed) and inbound patient replies' })
  async handleWebhook(
    @Body() body: any,
    @Headers('x-hub-signature-256') signatureHeader?: string
  ) {
    const rawBody = JSON.stringify(body || {});
    const sigValid = this.whatsappService.verifyWebhookSignature(rawBody, signatureHeader);
    if (!sigValid) {
      throw new ForbiddenException('Invalid Meta webhook HMAC-SHA256 signature.');
    }

    const results: any[] = [];

    // Support both standard Meta Graph webhook structure and direct simplified webhook test structure
    if (body?.whatsappMessageId && body?.status) {
      const statusResult = await this.whatsappService.processDeliveryStatusWebhook({
        whatsappMessageId: body.whatsappMessageId,
        status: body.status,
        errorCode: body.errorCode,
        errorTitle: body.errorTitle,
        rawPayload: body,
        signatureValid: sigValid,
      });
      results.push(statusResult);
    }

    if (body?.entry && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        for (const change of entry.changes || []) {
          const val = change.value || {};
          // 1. Delivery / Read Status Updates
          for (const st of val.statuses || []) {
            const r = await this.whatsappService.processDeliveryStatusWebhook({
              whatsappMessageId: st.id,
              status: st.status,
              errorCode: st.errors?.[0]?.code ? String(st.errors[0].code) : undefined,
              errorTitle: st.errors?.[0]?.title,
              rawPayload: st,
              signatureValid: sigValid,
            });
            results.push(r);
          }
          // 2. Inbound Interactive Button or Text Replies
          for (const msg of val.messages || []) {
            const fromMobile = msg.from;
            const textBody =
              msg.text?.body ||
              msg.interactive?.button_reply?.title ||
              msg.button?.text ||
              '';
            const btnPayload =
              msg.interactive?.button_reply?.id ||
              msg.button?.payload ||
              undefined;
            if (textBody || btnPayload) {
              const resp = await this.responsesService.processInboundResponse({
                senderMobile: fromMobile,
                rawResponseText: textBody || btnPayload,
                buttonPayload: btnPayload,
                responseChannel: btnPayload ? 'WHATSAPP_INTERACTIVE' : 'WHATSAPP_TEXT',
              });
              results.push({ inboundProcessed: true, responseId: resp.id, action: resp.mappedAction });
            }
          }
        }
      }
    }

    return { success: true, processedEvents: results.length, data: results };
  }
}
