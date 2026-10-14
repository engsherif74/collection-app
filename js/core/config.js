export const CFG={
  schema:1, db:'collect-app', dbVer:1, iter:210000, salt:'collect-app-v1',
  stores:['meta','subscribers','namesDirectory','ledger','advance','outOfRange','otherSource','snapshot','archiveDaily','archiveMonthly','personalDealings','personalPayments','lastPosition','previousFile','settings'],
  cols:['شقة','عمارة','بلوك','اسم العميل','العدد','القيمة','القطاع','شهر الإصدار'],
  alias:{'فيمة':'القيمة','قيمة':'القيمة','عدد':'العدد','الي':'شهر الإصدار','إلي':'شهر الإصدار'}
};
