
import React from 'react';
import { Order } from '../types';

interface OrderBookProps {
  bids: Order[];
  asks: Order[];
  ticker: string;
  onRowClick?: (price: number) => void;
}

export const OrderBook: React.FC<OrderBookProps> = ({ bids, asks, ticker, onRowClick }) => {
  const maxVolume = Math.max(
    ...bids.map(o => o.amount),
    ...asks.map(o => o.amount),
    1 // prevent div by zero
  );

  const renderRow = (order: Order, isBid: boolean) => (
    <div 
      key={order.id} 
      onClick={() => onRowClick && onRowClick(order.price)}
      className="grid grid-cols-3 text-xs py-1 hover:bg-white/10 cursor-pointer relative group transition-colors"
    >
      {/* Depth Visualizer */}
      <div 
        className={`absolute top-0 bottom-0 ${isBid ? 'right-0 bg-green-500/10' : 'left-0 bg-red-500/10'} transition-all`}
        style={{ width: `${(order.amount / maxVolume) * 100}%` }}
      ></div>
      
      <span className={`relative z-10 pl-2 font-mono ${isBid ? 'text-xrpl-accent' : 'text-red-400'}`}>
        {order.price.toFixed(2)}
      </span>
      <span className="relative z-10 text-right font-mono text-gray-400">{order.amount.toLocaleString()}</span>
      <span className="relative z-10 text-right pr-2 font-mono text-gray-500">{(order.price * order.amount).toFixed(0)}</span>
    </div>
  );

  return (
    <div className="bg-[#0f1114] border border-gray-800 rounded-lg flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center">
        <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Order Book ({ticker}/USD)</h3>
      </div>
      
      <div className="grid grid-cols-3 text-[10px] text-gray-500 px-2 py-1 uppercase tracking-wide">
        <span>Price</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Total</span>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {/* Asks (Sells) - Reversed so lowest price is at bottom (nearest to spread) */}
        <div className="flex-1 overflow-y-auto flex flex-col-reverse custom-scrollbar">
          {asks.length === 0 && <div className="text-center text-gray-600 text-[10px] py-4">No Asks</div>}
          {asks.map(order => renderRow(order, false))}
        </div>

        {/* Current Price Indicator (Spread) */}
        <div className="py-2 border-y border-gray-800 text-center bg-gray-900/30">
          <span className="text-lg font-mono text-white font-bold">
             {asks.length > 0 && bids.length > 0 
                ? ((asks[0].price + bids[0].price) / 2).toFixed(2) 
                : '---'}
          </span>
          <span className="text-xs text-gray-500 ml-2">USD</span>
        </div>

        {/* Bids (Buys) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {bids.length === 0 && <div className="text-center text-gray-600 text-[10px] py-4">No Bids</div>}
          {bids.map(order => renderRow(order, true))}
        </div>
      </div>
    </div>
  );
};
